import { z } from "zod";

// ~500 KB of base64 ≈ 375 KB image — plenty for a receipt logo while
// keeping the settings row (and JSON backups) small.
export const MAX_LOGO_DATA_URL_LENGTH = 500_000;

export const brandingSchema = z.object({
  school_name: z
    .string()
    .min(1, "School name is required")
    .max(120, "School name must be 120 characters or fewer")
    .trim(),
  tagline: z
    .string()
    .max(160, "Tagline must be 160 characters or fewer")
    .trim()
    .optional()
    .default(""),
  address: z
    .string()
    .max(300, "Address must be 300 characters or fewer")
    .trim()
    .optional()
    .default(""),
  phone: z
    .string()
    .max(40, "Phone must be 40 characters or fewer")
    .trim()
    .optional()
    .default(""),
  logo_data_url: z
    .string()
    .max(MAX_LOGO_DATA_URL_LENGTH, "Logo image is too large (max ~375 KB)")
    .refine(
      (val) =>
        val === "" ||
        /^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(
          val
        ),
      "Logo must be a PNG, JPEG, WebP or SVG image"
    )
    .optional()
    .default(""),
});

export type Branding = z.infer<typeof brandingSchema>;

export const DEFAULT_BRANDING: Branding = {
  school_name: "Sun Sea Nursery School",
  tagline: "",
  address: "",
  phone: "",
  logo_data_url: "",
};
