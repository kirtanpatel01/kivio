import { authClient } from "#/lib/auth-client";
import { IconLoader } from "@tabler/icons-react";
import { useState } from "react";

function LoginBtn() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });

      if (res?.error) {
        const msg =
          res.error.message ||
          "Authentication failed. Please verify server environment variables.";
        console.error("[Authentication Error]:", msg, res.error);
        setErrorMessage(msg);
        setLoading(false);
      }
    } catch (error: any) {
      const msg =
        error?.message || "Failed to communicate with authentication service.";
      console.error("[Authentication Exception]:", msg, error);
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleGoogleSignIn}
        className="bg-primary/90 hover:bg-primary rounded-lg px-2 py-0.5 sm:px-3 sm:py-1.5 cursor-pointer text-xs sm:text-sm font-semibold w-16 shr flex justify-center items-center"
      >
        {loading ? <IconLoader className="animate-spin" size={16} /> : "Login"}
      </button>

      {errorMessage && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-red-950/95 border border-red-500/50 text-red-200 text-xs rounded-lg p-3 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-red-300">Login Failed</p>
              <p className="mt-1 leading-relaxed text-red-200/90">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-100 font-bold px-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginBtn;
