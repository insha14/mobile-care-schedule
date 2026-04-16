import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const file = join(process.cwd(), 'db.json')

const defaultData = {
  stores: [
    { id: 's1', name: 'Southlake Mall', open: '10:00', close: '20:00' },
    { id: 's2', name: 'Cumberland Mall', open: '11:00', close: '20:00' },
    { id: 's3', name: 'Perimeter Mall', open: '11:00', close: '20:00' }
  ],
  employees: [
    { id: 'm1', name: 'Alisha', role: 'manager', homeStore: 'Perimeter Mall', canRotate: false, pin: '1001' },
    { id: 'm2', name: 'Ankush', role: 'manager', homeStore: 'Southlake Mall', canRotate: false, pin: '1002' },
    { id: 'm3', name: 'Insha', role: 'manager', homeStore: 'Cumberland Mall', canRotate: false, pin: '1003' },
    { id: 'e1', name: 'Zarine', role: 'employee', homeStore: null, canRotate: true, pin: '1111' },
    { id: 'e2', name: 'Rehan', role: 'employee', homeStore: null, canRotate: true, pin: '2222' },
    { id: 'e3', name: 'Omar', role: 'employee', homeStore: null, canRotate: true, pin: '3333' },
    { id: 'b1', name: 'Corey', role: 'backup', homeStore: null, canRotate: true, pin: '4444' }
  ],
  restrictions: []
}

const db = {
  data: null,

  async read() {
    try {
      const content = await readFile(file, 'utf-8')
      this.data = JSON.parse(content)
    } catch (error) {
      this.data = defaultData
      await this.write()
    }
  },

  async write() {
    await writeFile(file, JSON.stringify(this.data, null, 2))
  }
}

await db.read()

export default db