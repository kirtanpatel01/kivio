import { authClient } from "#/lib/auth-client";
import { IconLoader } from "@tabler/icons-react";
import { useState } from "react";

function LoginBtn() {
  const [loading, setLoading] = useState(false);
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setLoading(false);
    }
  };
  return (
    <button
      onClick={handleGoogleSignIn}
      className="bg-primary/90 hover:bg-primary rounded-lg px-2 py-0.5 sm:px-3 sm:py-1.5 cursor-pointer text-xs sm:text-sm font-semibold w-16 shr flex justify-center items-center"
    >
      {loading ? <IconLoader className="animate-spin" size={16} /> : "Login"}
    </button>
  );
}

export default LoginBtn;
