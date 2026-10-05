declare global {
	namespace App {
		interface Platform {
			env: import('#lib/server/entorno').EntornoWorker;
		}
	}
}

export {};
