-- =============================================
-- Multiple fee configs per grade (distinguished by title)
-- + direct student → fee config mapping
-- =============================================

-- Title identifies each fee structure within a grade/year
-- (e.g. 'Regular', 'RTE Concession', 'Staff Ward')
ALTER TABLE fee_configs ADD COLUMN title TEXT NOT NULL DEFAULT 'Regular';

-- Allow more than one config per grade/year, unique per title instead
ALTER TABLE fee_configs DROP CONSTRAINT IF EXISTS fee_configs_grade_academic_year_key;
ALTER TABLE fee_configs ADD CONSTRAINT fee_configs_grade_year_title_key
  UNIQUE (grade, academic_year, title);

-- Each student is assigned a fee structure (required for new students in the
-- app; nullable in the DB so pre-existing rows stay valid)
ALTER TABLE students ADD COLUMN fee_config_id UUID REFERENCES fee_configs(id);
CREATE INDEX idx_students_fee_config ON students(fee_config_id);

-- Backfill: assign existing students their grade's config
-- (latest academic year per grade). Idempotent.
UPDATE students s
SET fee_config_id = fc.id
FROM (
  SELECT DISTINCT ON (grade) id, grade
  FROM fee_configs
  ORDER BY grade, academic_year DESC
) fc
WHERE fc.grade = s.grade
  AND s.fee_config_id IS NULL;
