import { useAppStore } from "@/stores/main";
import { AppBarProps, AppBar as BaseAppBar } from "@mui/material";

const AppBar: React.FC<AppBarProps> = ({ children, ...props }) => {
  const enableColorOnDarkMode = useAppStore((state) => state.enableColorOnDark);
  return (
    <BaseAppBar {...props} enableColorOnDark={enableColorOnDarkMode}>
      {children}
    </BaseAppBar>
  );
};

export default AppBar;
