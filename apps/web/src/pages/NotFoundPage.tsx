import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="h1">{t('app.notFoundTitle')}</Typography>
        <Typography color="text.secondary">{t('app.notFoundBody')}</Typography>
        <Button component={RouterLink} to="/" variant="contained">
          {t('app.backToMap')}
        </Button>
      </Stack>
    </Container>
  );
}
