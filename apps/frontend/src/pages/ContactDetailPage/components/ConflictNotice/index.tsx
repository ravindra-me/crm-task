import { Alert, Button } from '@/lib';
import {
  EDITABLE_FIELDS,
  FIELD_LABELS,
  toFormValues,
  type ContactFormValues,
} from '@/utils/contactSchemas';
import type { Contact } from '@/types/contact';
import styles from './style.module.css';

interface ConflictNoticeProps {
  mine: ContactFormValues;
  latest: Contact;
  onUseLatest: () => void;
  onKeepMine: () => void;
  saving: boolean;
}

function show(value: string) {
  return value ? value : <span className={styles.empty}>empty</span>;
}

export function ConflictNotice({
  mine,
  latest,
  onUseLatest,
  onKeepMine,
  saving,
}: ConflictNoticeProps) {
  const theirs = toFormValues(latest);
  const differences = EDITABLE_FIELDS.filter((field) => theirs[field] !== mine[field].trim());

  return (
    <Alert tone="warning" title="Someone else updated this contact while you were editing">
      {differences.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Saved version</th>
              <th scope="col">Your edit</th>
            </tr>
          </thead>
          <tbody>
            {differences.map((field) => (
              <tr key={field}>
                <th scope="row">{FIELD_LABELS[field]}</th>
                <td>{show(theirs[field])}</td>
                <td>{show(mine[field])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Their changes match yours, so nothing will be lost either way.</p>
      )}
      <div className={styles.actions}>
        <Button size="sm" onClick={onUseLatest} disabled={saving}>
          Discard mine, use saved version
        </Button>
        <Button size="sm" variant="primary" onClick={onKeepMine} loading={saving}>
          Overwrite with my changes
        </Button>
      </div>
    </Alert>
  );
}
