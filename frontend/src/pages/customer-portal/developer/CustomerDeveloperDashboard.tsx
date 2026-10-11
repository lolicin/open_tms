import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, KeyRound, Loader2, Network, Webhook } from 'lucide-react';

import { API_URL } from '../../../api';
import { customerFetch } from '../CustomerDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { t } from '@/i18n';

interface Summary {
  apiKeys: { total: number; active: number };
  webhooks: { total: number; enabled: number };
  tradingPartners: number;
  ediTransactionsLast7Days: number;
}

interface TileProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string | number;
  secondary?: string;
}

function Tile({ to, icon: Icon, label, primary, secondary }: TileProps) {
  return (
    <Link to={to} className="block">
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" />
            {label}
          </div>
          <div className="text-3xl font-bold tracking-tight">{primary}</div>
          {secondary && <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CustomerDeveloperDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerFetch(`${API_URL}/api/v1/customer-portal/developer/summary`)
      .then(r => r.json())
      .then(json => setSummary(json.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Developer')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            'Manage the credentials, webhooks, and EDI configuration that connect your systems to Open TMS.'
          )}
        </p>
      </div>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            to="/customer-portal/developer/api-keys"
            icon={KeyRound}
            label={t('API Keys')}
            primary={summary.apiKeys.active}
            secondary={`${summary.apiKeys.total} total`}
          />
          <Tile
            to="/customer-portal/developer/webhooks"
            icon={Webhook}
            label={t('Webhooks')}
            primary={summary.webhooks.enabled}
            secondary={`${summary.webhooks.total} configured`}
          />
          <Tile
            to="/customer-portal/developer/edi"
            icon={Network}
            label={t('Trading partners')}
            primary={summary.tradingPartners}
            secondary="EDI endpoints linked to your account"
          />
          <Tile
            to="/customer-portal/developer/logs"
            icon={History}
            label={t('EDI activity (7d)')}
            primary={summary.ediTransactionsLast7Days}
            secondary="transactions across all partners"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('Quick start')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              {t('Create an')}{' '}
              <Link to="/customer-portal/developer/api-keys" className="text-primary hover:underline">{t('API key')}</Link>{' '}
              {t('so your systems can authenticate.')}
            </li>
            <li>
              {t('Subscribe to')}{' '}
              <Link to="/customer-portal/developer/webhooks" className="text-primary hover:underline">{t('webhooks')}</Link>{' '}
              {t(
                'to receive real-time updates when your orders, shipments, and returns change state.'
              )}
            </li>
            <li>
              {t('Review your')}{' '}
              <Link to="/customer-portal/developer/edi" className="text-primary hover:underline">{t('EDI trading partner')}</Link>{' '}
              {t('setup if you exchange X12 documents with us.')}
            </li>
            <li>
              {t('Monitor integration health from the')}{' '}
              <Link to="/customer-portal/developer/logs" className="text-primary hover:underline">{t('activity log')}</Link>.
                          </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Signing & security')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>{t(
              'API keys are displayed once at creation. Store them in a secure vault - they cannot be retrieved later.'
            )}</li>
            <li>
              {t('Webhook payloads are signed with HMAC-SHA256. Every delivery includes')}{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{t('X-OpenTms-Signature: t=<unix_seconds>,v1=<hex_hmac>')}</code>{t('.\n              Verify by computing HMAC-SHA256 of')}{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{t('`${t}.${raw_body}`')}</code>{' '}
              {t('with the webhook secret.')}
            </li>
            <li>{t(
              'Rotate a webhook secret any time from the webhook detail view - old signatures stop validating immediately.'
            )}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
