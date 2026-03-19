import { authClient } from "#/auth";
import LoginBtn from "./login-btn";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconLoader, IconLoader2, IconLogout } from "@tabler/icons-react";

function UserDropdown() {
  const { data, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (isPending) {
    return (
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/50">
        <IconLoader size={16} className="animate-spin" />
      </div>
    );
  }

  if (!data?.user) {
    return <LoginBtn />;
  }

  const user = data.user;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer rounded-full ring-2 ring-transparent hover:ring-primary/40 transition-all duration-200"
      >
        <img
          src={user.image || "/avatar.png"}
          alt={user.name || "User"}
          className="w-8 h-8 rounded-full"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-background shadow-lg shadow-black/10 overflow-hidden z-50"
          >
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <img
                src={user.image || "/avatar.png"}
                alt={user.name || "User"}
                className="w-10 h-10 rounded-full shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-foreground-secondary truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Logout */}
            <div className="p-1.5">
              <button
                onClick={async () => {
                  await authClient.signOut();
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors duration-150"
              >
                <IconLogout size={16} />
                <span>Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserDropdown;
