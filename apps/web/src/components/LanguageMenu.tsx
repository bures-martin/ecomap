import { LOCALES, LOCALE_LABELS, isLocale } from '@ecomap/shared';
import TranslateIcon from '@mui/icons-material/Translate';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const current = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'en';

  return (
    <>
      <Tooltip title={t('nav.language')}>
        <IconButton
          color="inherit"
          aria-label={`${t('nav.language')}: ${LOCALE_LABELS[current]}`}
          aria-haspopup="menu"
          aria-expanded={anchor !== null}
          onClick={(event) => {
            setAnchor(event.currentTarget);
          }}
        >
          <TranslateIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {LOCALES.map((locale) => (
          <MenuItem
            key={locale}
            lang={locale}
            selected={locale === current}
            onClick={() => {
              void i18n.changeLanguage(locale);
              setAnchor(null);
            }}
          >
            {LOCALE_LABELS[locale]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
