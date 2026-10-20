import { Link, Outlet } from 'react-router';
import { Icon } from '@/lib';
import styles from './style.module.css';

export function AppLayout() {
  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.logo}>
              <Icon name="users" />
            </span>
            Contact Workspace
          </Link>
        </div>
      </header>
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
