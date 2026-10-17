import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const rolldownCompat = (): import("vite").Plugin => ({
	name: "tanstack-start-rolldown-compat",
	configEnvironment(_name, envConfig) {
		const build = envConfig.build as
			| (import("vite").BuildEnvironmentOptions & {
					rolldownOptions?: Record<string, unknown>;
			  })
			| undefined;

		if (build?.rolldownOptions) {
			build.rollupOptions = {
				...build.rolldownOptions,
				...build.rollupOptions,
			};
		}
	},
});

const config = defineConfig({
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		devtools(),
		tailwindcss(),
		tanstackStart(),
		rolldownCompat(),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
	},
	server: {
		allowedHosts: ["unjuvenilely-nonveritable-kelsie.ngrok-free.dev"],
	},
});

export default config;
