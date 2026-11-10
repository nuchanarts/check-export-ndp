import 'dotenv/config'

type QueryParam = string | number | boolean | null

interface DbRow {
  [key: string]: unknown
}

interface DbResult {
  rows: DbRow[]
  rowCount: number
}

let dbModule: { query: (sql: string, params?: QueryParam[]) => Promise<DbResult> } | null = null

async function getDb() {
  if (dbModule) return dbModule

  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL environment variable is not set')

  if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
    const mysql = await import('mysql2/promise')
    const pool = mysql.createPool(url)
    dbModule = {
      async query(sql: string, params: QueryParam[] = []) {
        const [rows] = await pool.execute(sql.replace(/\?/g, '?'), params)
        const arr = rows as DbRow[]
        return { rows: arr, rowCount: arr.length }
      },
    }
  } else {
    throw new Error(`Only MySQL is supported (mysql://…), got: ${url.split('://')[0]}`)
  }

  return dbModule
}

export async function query(sql: string, params: QueryParam[] = []): Promise<DbResult> {
  const db = await getDb()
  return db.query(sql, params)
}
