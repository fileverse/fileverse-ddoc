import { CommentAccountProps } from '../../../types';
import { SetStateAction } from 'react';

export interface CommentUsernameProps extends CommentAccountProps {
  username?: string | null;
  setUsername?: React.Dispatch<SetStateAction<string>>;
  isNavbarVisible?: boolean;
}

export interface EnsEntry {
  name: string;
  isEns: boolean;
}

export type EnsCache = Record<string, EnsEntry>;
