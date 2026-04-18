import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL ?? '';
const isMysql = url.startsWith('mysql://') || url.startsWith('mariadb://');

export default defineConfig(
	isMysql
		? {
				dialect: 'mysql',
				schema: './src/lib/server/schema/mysql.js',
				out: './drizzle/mysql',
				dbCredentials: { url }
			}
		: {
				dialect: 'sqlite',
				schema: './src/lib/server/schema/sqlite.js',
				out: './drizzle/sqlite',
				dbCredentials: { url: './data/family_board.db' }
			}
);
