import { useFilterContext } from '@/components/filters/context';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

type RemoveButtonProps = {
  icon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function RemoveButton({
  className,
  icon = <Icons.X />,
  ...props
}: RemoveButtonProps) {
  const context = useFilterContext();

  return (
    <Button
      className={className}
      size={
        context.size === 'sm'
          ? 'icon-sm'
          : context.size === 'lg'
            ? 'icon-lg'
            : 'icon'
      }
      variant="outline"
      {...props}
    >
      {icon}
    </Button>
  );
}

export { RemoveButton };
export type { RemoveButtonProps };
