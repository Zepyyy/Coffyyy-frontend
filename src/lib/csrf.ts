// src/lib/csrf.ts

let csrfToken: string | undefined;

export function getCsrfToken() {
	return csrfToken;
}

export function setCsrfToken(token: string | undefined) {
	csrfToken = token;
}

export function clearCsrfToken() {
	csrfToken = undefined;
}
