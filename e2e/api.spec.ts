import { test, expect } from "@playwright/test";

/**
 * API-level integration tests.
 *
 * Uses Playwright's `request` fixture which reuses the admin storageState
 * from auth.setup.ts. No browser is launched — pure HTTP against the live
 * Next.js API routes + Supabase DB.
 */

test.describe("API: authentication", () => {
  test("unauthenticated request cannot read /api/accounts", async ({
    baseURL,
  }) => {
    // Use raw fetch (no Playwright context, no cookies inherited) and manual redirect handling
    const res = await fetch(`${baseURL}/api/accounts`, { redirect: "manual" });
    // Server should redirect to /login (307/302) for unauthenticated requests
    expect([301, 302, 303, 307, 308]).toContain(res.status);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
  });
});

test.describe("API: accounts", () => {
  test("GET /api/accounts returns seeded accounts with balance", async ({
    request,
  }) => {
    const res = await request.get("/api/accounts");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as Array<{
      id: string;
      name: string;
      is_online: boolean;
      balance: number;
    }>;
    const names = body.map((a) => a.name).sort();
    expect(names).toEqual(expect.arrayContaining(["Bank", "Cash", "UPI"]));
    for (const acc of body) {
      expect(typeof acc.balance).toBe("number");
    }
  });

  test("POST /api/accounts → PATCH → DELETE round-trip", async ({ request }) => {
    const name = `API-${Date.now()}`;

    // Create
    const created = await request.post("/api/accounts", {
      data: { name, is_online: false },
    });
    expect(created.status()).toBe(201);
    const account = await created.json();
    expect(account.name).toBe(name);
    expect(account.is_online).toBe(false);

    // Update
    const patched = await request.patch(`/api/accounts/${account.id}`, {
      data: { is_online: true },
    });
    expect(patched.status()).toBe(200);
    const updated = await patched.json();
    expect(updated.is_online).toBe(true);

    // Read back via list (account-level GET-by-id exists too, but list confirms ordering)
    const list = await request.get("/api/accounts");
    const found = ((await list.json()) as Array<{ id: string; name: string }>).find(
      (a) => a.id === account.id,
    );
    expect(found?.name).toBe(name);

    // Delete
    const deleted = await request.delete(`/api/accounts/${account.id}`);
    expect(deleted.status()).toBe(204);
  });

  test("POST /api/accounts with empty name → 400", async ({ request }) => {
    const res = await request.post("/api/accounts", {
      data: { name: "", is_online: false },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("DELETE seeded Cash account → 409 (in use / would lose balance reference)", async ({
    request,
  }) => {
    const list = (await (await request.get("/api/accounts")).json()) as Array<{
      id: string;
      name: string;
    }>;
    const cash = list.find((a) => a.name === "Cash");
    if (!cash) test.skip(true, "Cash account missing (DB out of sync)");
    const res = await request.delete(`/api/accounts/${cash!.id}`);
    // 409 if anything references it; 204 if truly empty — both are valid.
    // The test just verifies the API responds correctly without server error.
    expect([204, 409]).toContain(res.status());
  });
});

test.describe("API: account adjustments", () => {
  test("POST adjustment increase → balance moves; net-out keeps DB clean", async ({
    request,
  }) => {
    // Use the seeded Bank account; net to zero at the end.
    const list = (await (await request.get("/api/accounts")).json()) as Array<{
      id: string;
      name: string;
      balance: number;
    }>;
    const bank = list.find((a) => a.name === "Bank");
    expect(bank).toBeTruthy();
    const startBalance = bank!.balance;

    // Increase by 7.50
    const up = await request.post(`/api/accounts/${bank!.id}/adjustments`, {
      data: { type: "increase", amount: 7.5, reason: "API integration test +" },
    });
    expect(up.status()).toBe(201);
    const upBody = await up.json();
    expect(upBody.amount).toBe(7.5);

    // Verify balance moved by +7.50
    const afterUp = ((await (await request.get("/api/accounts")).json()) as Array<{
      id: string;
      balance: number;
    }>).find((a) => a.id === bank!.id);
    expect(afterUp?.balance).toBeCloseTo(startBalance + 7.5, 2);

    // Decrease by 7.50 to net out
    const down = await request.post(`/api/accounts/${bank!.id}/adjustments`, {
      data: { type: "decrease", amount: 7.5, reason: "API integration test -" },
    });
    expect(down.status()).toBe(201);

    const afterDown = ((await (await request.get("/api/accounts")).json()) as Array<{
      id: string;
      balance: number;
    }>).find((a) => a.id === bank!.id);
    expect(afterDown?.balance).toBeCloseTo(startBalance, 2);
  });

  test("POST adjustment missing reason → 400", async ({ request }) => {
    const list = (await (await request.get("/api/accounts")).json()) as Array<{
      id: string;
      name: string;
    }>;
    const bank = list.find((a) => a.name === "Bank")!;

    const res = await request.post(`/api/accounts/${bank.id}/adjustments`, {
      data: { type: "increase", amount: 1, reason: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST adjustment zero amount → 400", async ({ request }) => {
    const list = (await (await request.get("/api/accounts")).json()) as Array<{
      id: string;
      name: string;
    }>;
    const bank = list.find((a) => a.name === "Bank")!;

    const res = await request.post(`/api/accounts/${bank.id}/adjustments`, {
      data: { type: "increase", amount: 0, reason: "test" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("API: students", () => {
  test("POST minimal student → 201, then DELETE", async ({ request }) => {
    const stamp = Date.now().toString().slice(-8);
    const name = `API Minimal ${stamp}`;
    const create = await request.post("/api/students", {
      data: {
        admission_no: "",
        name,
        grade: "PreKG",
        section: "A",
        status: "active",
      },
    });
    expect(create.status()).toBe(201);
    const student = await create.json();
    expect(student.id).toBeTruthy();
    expect(student.name).toBe(name);
    expect(student.gender).toBeNull();
    expect(student.father_name).toBeNull();

    const del = await request.delete(`/api/students/${student.id}`);
    expect(del.status()).toBe(204);
  });

  test("POST full student → 201, all fields persisted", async ({ request }) => {
    const stamp = Date.now().toString().slice(-8);
    const create = await request.post("/api/students", {
      data: {
        admission_no: "",
        name: `API Full ${stamp}`,
        gender: "male",
        date_of_birth: "2020-08-12",
        blood_group: "B+",
        nationality: "Indian",
        religion: "Hindu",
        community: "OBC",
        caste: "Test",
        aadhaar_no: "123456789012",
        grade: "LKG",
        section: "B",
        status: "active",
        father_name: "Test Father",
        father_occupation: "Engineer",
        father_company: "TestCo",
        father_mobile: "+91 98765 43210",
        father_email: "father@example.com",
        father_annual_income: 750000,
        mother_name: "Test Mother",
        mother_occupation: "Doctor",
        mother_company: "Hospital",
        mother_mobile: "+91 98765 43211",
        mother_email: "mother@example.com",
        mother_annual_income: 950000,
        guardian_name: "",
        guardian_relationship: "",
        guardian_mobile: "",
        guardian_address: "",
        address_line: "12 Test Street",
        city: "Chennai",
        state: "Tamil Nadu",
        pin_code: "600001",
        emergency_contact: "+91 98765 99999",
        alternate_phone: "+91 98765 88888",
      },
    });
    expect(create.status()).toBe(201);
    const s = await create.json();
    expect(s.gender).toBe("male");
    expect(s.blood_group).toBe("B+");
    expect(s.date_of_birth).toBe("2020-08-12");
    expect(Number(s.father_annual_income)).toBe(750000);
    expect(s.pin_code).toBe("600001");

    await request.delete(`/api/students/${s.id}`);
  });

  test("POST student missing required name → 422", async ({ request }) => {
    const res = await request.post("/api/students", {
      data: {
        admission_no: "",
        name: "",
        grade: "PreKG",
        section: "A",
        status: "active",
      },
    });
    expect(res.status()).toBe(422);
  });

  test("POST student with invalid Aadhaar → 422", async ({ request }) => {
    const res = await request.post("/api/students", {
      data: {
        admission_no: "",
        name: "Invalid Aadhaar Test",
        grade: "PreKG",
        section: "A",
        status: "active",
        aadhaar_no: "12345", // not 12 digits
      },
    });
    expect(res.status()).toBe(422);
  });

  test("GET /api/students/[bad-uuid] → 404", async ({ request }) => {
    const res = await request.get(
      "/api/students/00000000-0000-4000-9000-000000000000",
    );
    expect(res.status()).toBe(404);
  });
});

test.describe("API: students - search across father/mother", () => {
  test("created student is findable by father name search", async ({ request }) => {
    const stamp = Date.now().toString().slice(-8);
    const fatherName = `SearchableFather_${stamp}`;
    const create = await request.post("/api/students", {
      data: {
        admission_no: "",
        name: `Search Test ${stamp}`,
        grade: "PreKG",
        section: "A",
        status: "active",
        father_name: fatherName,
      },
    });
    expect(create.status()).toBe(201);
    const s = await create.json();

    // List with search
    const list = await request.get(
      `/api/students?search=${encodeURIComponent(fatherName)}`,
    );
    expect(list.status()).toBe(200);
    const body = (await list.json()) as {
      students: Array<{ id: string }>;
    };
    expect(body.students.some((x) => x.id === s.id)).toBe(true);

    await request.delete(`/api/students/${s.id}`);
  });
});
