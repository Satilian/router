import { useEffect } from 'react';
import { useRouter } from './router-provider';

type Props = {
  to: string;
  replace?: boolean;
};

export const Navigate = ({ to, replace = false }: Props) => {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate(to, { replace });
  }, [to, replace]);

  // Navigate компонент не рендерит ничего видимого
  return null;
};
