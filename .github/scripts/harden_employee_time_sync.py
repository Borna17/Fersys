from pathlib import Path

p = Path('src/services/employeeTime.service.ts')
text = p.read_text(encoding='utf-8')
text = text.replace(
    "import type { CompanyEmployee } from './employees.service'",
    "import { getEmployees, type CompanyEmployee } from './employees.service'",
)
text = text.replace(
    """  const workers = await getWorkforcePeople()
  const matched = workers.filter((worker) => normalized(text).includes(normalized(worker.fullName))""",
    """  const workers = await syncAppEmployees(await getEmployees())
  const matched = workers.filter((worker) => normalized(text).includes(normalized(worker.fullName))""",
    1,
)
text = text.replace(
    """  const workers = await getWorkforcePeople()
  for (const name of names) {""",
    """  const workers = await syncAppEmployees(await getEmployees())
  for (const name of names) {""",
    1,
)
p.write_text(text, encoding='utf-8')
print('Employee time sync hardened.')
