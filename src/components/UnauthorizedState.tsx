interface UnauthorizedStateProps {
  title: string;
  description: string;
}

export default function UnauthorizedState({ title, description }: UnauthorizedStateProps) {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="space-y-2 max-w-sm">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
