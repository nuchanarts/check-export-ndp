import {
  API_BASES,
  API_ENDPOINTS,
  API_HEADERS,
  SIGN_ON_STEPS,
  STD_FILES,
  BILLGRCS_TABLE,
  CODESYS_LABELS,
  RECORD_STATUS,
  COMMON_ERRORS,
} from '../../data/ppApiOverview'

export function PpApiOverview() {
  return (
    <div className="space-y-5">
      <Panel title="Endpoint หลัก">
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {API_BASES.map(b => (
            <span key={b.env} className="bg-gray-100 rounded-lg px-2.5 py-1">
              <b>{b.env}</b> <code className="font-mono">{b.url}</code>
            </span>
          ))}
        </div>
        <Table head={['Method', 'Path', 'ใช้ทำอะไร']}>
          {API_ENDPOINTS.map(e => (
            <tr key={e.path}>
              <Td><span className="font-mono text-xs font-bold">{e.method}</span></Td>
              <Td><code className="font-mono text-xs break-all">{e.path}</code></Td>
              <Td>{e.purpose}</Td>
            </tr>
          ))}
        </Table>
      </Panel>

      <Panel title="การยืนยันตัวตน">
        <Table head={['Header', 'รายละเอียด']}>
          {API_HEADERS.map(h => (
            <tr key={h.name}>
              <Td><code className="font-mono text-xs">{h.name}</code></Td>
              <Td>{h.detail}</Td>
            </tr>
          ))}
        </Table>
        <ol className="list-decimal pl-5 mt-3 space-y-1 text-sm text-gray-700">
          {SIGN_ON_STEPS.map(s => <li key={s}>{s}</li>)}
        </ol>
      </Panel>

      <Panel title="โครงสร้าง 13 แฟ้ม Plus (stdDatas — 1 สมาชิก = 1 visit)">
        <Table head={['แฟ้ม', 'ชื่อ', 'JSON key', 'จำเป็น', 'Array']}>
          {STD_FILES.map(f => (
            <tr key={f.no}>
              <Td>{f.no}</Td>
              <Td>{f.name}</Td>
              <Td><code className="font-mono text-xs">{f.key}</code></Td>
              <Td>{f.required}</Td>
              <Td>{f.array ? 'Y' : 'N'}</Td>
            </tr>
          ))}
        </Table>
        <p className="text-xs text-gray-500 mt-2">
          กิจกรรม PP ส่วนใหญ่เกี่ยวกับแฟ้ม 5 diagnosis, 6 procedure และ 7 chad — แฟ้มอื่นต้องแนบทุกครั้งแต่ไม่ผันแปรตามกิจกรรม
        </p>
      </Panel>

      <Panel title="หมวดค่าใช้จ่าย (BILLGRCS) และ CODESYS ที่ใช้ได้">
        <Table head={['BILLGRCS', 'หมวด', 'CODESYS']}>
          {BILLGRCS_TABLE.map(r => (
            <tr key={r.billgrcs}>
              <Td><span className="font-mono">{r.billgrcs}</span></Td>
              <Td>{r.label}</Td>
              <Td><span className="font-mono text-xs">{r.codesys.join(', ')}</span></Td>
            </tr>
          ))}
        </Table>
        <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
          {CODESYS_LABELS.map(c => (
            <li key={c.codesys}><span className="font-mono font-semibold">{c.codesys}</span> — {c.label}</li>
          ))}
        </ul>
      </Panel>

      <div className="grid md:grid-cols-2 gap-5">
        <Panel title="recordStatus (status-tracks)">
          <ul className="space-y-1 text-sm">
            {RECORD_STATUS.map(s => (
              <li key={s.status}><span className="font-mono font-semibold w-5 inline-block">{s.status}</span> {s.label}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Error code ที่พบบ่อย">
          <ul className="space-y-1 text-sm">
            {COMMON_ERRORS.map(e => (
              <li key={e.code}><span className="font-mono font-semibold">{e.code}</span> — {e.label}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <h2 className="text-sm font-bold text-gray-800 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b">
            {head.map(h => <th key={h} className="py-1.5 pr-4 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-1.5 pr-4 align-top text-gray-700">{children}</td>
}
