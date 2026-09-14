import { ROLES, type Role } from '@ecomap/shared';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useSetUserRole, useUsers } from '../api/hooks.js';
import { useAuth } from '../auth/useAuth.js';
import { QueryBoundary } from '../components/QueryBoundary.js';
import { useToast } from '../components/ToastProvider.js';
import { useApiErrorMessage } from '../hooks/useApiErrorMessage.js';

export function PeoplePage() {
  const { t, i18n } = useTranslation();
  const { can } = useAuth();
  const toast = useToast();
  const errorMessage = useApiErrorMessage();

  const usersQuery = useUsers(true);
  const setRole = useSetUserRole();
  const mayAssignRoles = can('role:assign');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>
        {t('people.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('people.intro')}
      </Typography>

      <QueryBoundary query={usersQuery}>
        {(users) => (
          <TableContainer component={Paper}>
            <Table aria-label={t('people.title')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('people.name')}</TableCell>
                  <TableCell>{t('people.email')}</TableCell>
                  <TableCell>{t('people.twoFactor')}</TableCell>
                  <TableCell>{t('people.joined')}</TableCell>
                  <TableCell>{t('people.role')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>{person.displayName}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>
                      {person.totpEnabled ? (
                        <Chip size="small" color="success" label={t('auth.twoFactorOn')} />
                      ) : (
                        <Chip size="small" label={t('auth.twoFactorOff')} />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(person.createdAt).toLocaleDateString(i18n.language)}
                    </TableCell>
                    <TableCell>
                      {mayAssignRoles ? (
                        <TextField
                          select
                          size="small"
                          value={person.role}
                          aria-label={`${t('people.role')}: ${person.displayName}`}
                          onChange={(event) => {
                            setRole.mutate(
                              { id: person.id, role: event.target.value as Role },
                              {
                                onSuccess: () => {
                                  toast.showSuccess(t('people.roleChanged'));
                                },
                                onError: (error) => {
                                  toast.showError(errorMessage(error));
                                },
                              },
                            );
                          }}
                          sx={{ minWidth: 150 }}
                        >
                          {ROLES.map((role) => (
                            <MenuItem key={role} value={role}>
                              {t(`people.roles.${role}`)}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Chip size="small" label={t(`people.roles.${person.role}`)} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </QueryBoundary>
    </Container>
  );
}
