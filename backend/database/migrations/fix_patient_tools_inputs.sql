-- Migration: Remove tenant_id from patient_management MCP tools inputs
-- Run this SQL directly on your database to fix the tenant_id issue

-- First, let's see which tools need updating
SELECT tool_id, name, inputs
FROM nexent.ag_tool_info_t
WHERE usage = 'nexent'
  AND source = 'mcp'
  AND inputs LIKE '%tenant_id%'
  AND delete_flag != 'Y';

-- Update patient_management tools to remove tenant_id from inputs
-- The inputs field stores a string like: "{'patient_id': {...}, 'tenant_id': {...}, ...}"

UPDATE nexent.ag_tool_info_t
SET inputs = regexp_replace(
    regexp_replace(inputs, '''tenant_id''\s*:\s*\{[^}]*\}\s*,?\s*', '', 'g'),
    ',\s*}', '}', 'g'
)
WHERE usage = 'nexent'
  AND source = 'mcp'
  AND inputs LIKE '%tenant_id%'
  AND delete_flag != 'Y';

-- Verify the update
SELECT tool_id, name, inputs
FROM nexent.ag_tool_info_t
WHERE usage = 'nexent'
  AND source = 'mcp'
  AND name LIKE '%patient%'
  AND delete_flag != 'Y';
