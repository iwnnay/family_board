export function sessionCookieOptions() {
	const isProduction = process.env.NODE_ENV === 'production';
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isProduction,
		maxAge: 60 * 60 * 24 * 30
	};
}
