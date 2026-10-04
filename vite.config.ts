import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			"/api": {
				target: "https://coffyyy-backend-production.up.railway.app",
				changeOrigin: true,
				configure(proxy) {
					proxy.on("proxyRes", (response) => {
						// Local Vite uses HTTP; adapt upstream cookies only in this dev proxy.
						response.headers["set-cookie"] = response.headers[
							"set-cookie"
						]?.map((cookie) =>
							cookie
								.replace(/; Secure/gi, "")
								.replace(/SameSite=None/gi, "SameSite=Lax"),
						);
					});
				},
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
