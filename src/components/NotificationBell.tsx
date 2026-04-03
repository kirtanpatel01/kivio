import { useState } from "react";
import { IconBell, IconCheck, IconPlayerPlay } from "@tabler/icons-react";
import { getNotifications, markAsRead, markAllAsRead } from "#/actions/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn, formatDate } from "#/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function NotificationBell() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications = [] } = useQuery({
        queryKey: ["notifications"],
        queryFn: () => getNotifications(),
        refetchInterval: 30000, // Poll every 30 seconds for real-time feel
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const markReadMutation = useMutation({
        mutationFn: (id: string) => markAsRead({ data: id }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => markAllAsRead(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-secondary/60 transition-colors cursor-pointer group"
                aria-label="Notifications"
            >
                <IconBell 
                    size={22} 
                    className={cn(
                        "transition-transform",
                        isOpen ? "scale-90" : "group-hover:rotate-12"
                    )}
                />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-background"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]" 
                            onClick={() => setIsOpen(false)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="absolute right-0 mt-3 w-[340px] max-h-[480px] overflow-hidden rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-2xl z-50 flex flex-col"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-secondary/10">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase">
                                            New
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllReadMutation.mutate()}
                                        className="text-[11px] text-primary hover:text-primary/80 font-bold flex items-center gap-1 transition-colors"
                                    >
                                        <IconCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background/50">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-10 text-center gap-3">
                                        <div className="p-3 rounded-full bg-secondary/30">
                                            <IconBell size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground italic">
                                            Your inbox is empty
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/30">
                                        {notifications.map((n) => (
                                            <Link
                                                key={n.id}
                                                to="/videos/$videoId"
                                                params={{ videoId: n.videoId }}
                                                onClick={() => {
                                                    markReadMutation.mutate(n.id);
                                                    setIsOpen(false);
                                                }}
                                                className={cn(
                                                    "group flex gap-3 p-4 hover:bg-secondary/40 transition-all duration-200 relative",
                                                    !n.isRead && "bg-primary/3"
                                                )}
                                            >
                                                {!n.isRead && (
                                                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                                )}
                                                
                                                <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden border border-border/40 bg-secondary/20">
                                                    <img 
                                                        src={n.channelAvatar} 
                                                        alt={n.channelTitle} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                    <p className={cn(
                                                        "text-[13px] leading-[1.3] line-clamp-2 transition-colors",
                                                        !n.isRead ? "font-bold text-foreground" : "font-medium text-foreground/70 group-hover:text-foreground"
                                                    )}>
                                                        {n.title}
                                                    </p>
                                                    <div className="flex items-center justify-between gap-2 mt-auto">
                                                        <span className="text-[11px] font-bold text-primary/80 truncate">
                                                            {n.channelTitle}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                                            {formatDate(n.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                                                        <IconPlayerPlay size={14} fill="currentColor" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="p-3 border-t border-border/40 text-center bg-secondary/10">
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none">
                                        End of Notifications
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

