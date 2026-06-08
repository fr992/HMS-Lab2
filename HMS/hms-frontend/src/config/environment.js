const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const seqUrl = import.meta.env.VITE_SEQ_URL?.trim();

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required.");
}

if (!seqUrl) {
  throw new Error("VITE_SEQ_URL is required.");
}

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, "");
export const SEQ_URL = seqUrl.replace(/\/+$/, "");
