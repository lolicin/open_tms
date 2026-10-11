import React, { useState, useEffect, useCallback } from 'react';
import { CircleAlert, Search } from 'lucide-react';

import { API_URL } from '../api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { t } from '@/i18n';

interface EdiLog {
  id: string;
  transactionType: string;
  direction: string;
  status: string;
  fileName?: string;
  fileContent?: string;
  fileSize?: number;
  source?: string;
  transport?: string;
  shipmentReference?: string;
  shipmentId?: string;
  orderId?: string;
  tenderId?: string;
  invoiceNumber?: string;
  invoiceId?: string;
  errorMessage?: string;
  entitiesCreated?: number;
  entityIds?: string[];
  ack997Sent?: boolean;
  ack997Received?: boolean;
  retryCount?: number;
  parsedData?: any;
  partner?: { id: string; name: string } | null;
  createdAt: string;
  processedAt?: string;
}

type BadgeVariant = 'success' | 'destructive' | 'warning' | 'info' | 'secondary' | 'muted';

function statusVariant(status: string): BadgeVariant {
  switch ((status || '').toLowerCase()) {
    case 'success': return 'success';
    case 'error': return 'destructive';
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'duplicate': return 'secondary';
    default: return 'muted';
  }
}

const DIRECTION_LABEL: Record<string, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
};

export default function VNextEdiTransactionLog() {
  const [logs, setLogs] = useState<EdiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<EdiLog | null>(null);

  const [typeFilter, setTypeFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('transactionType', typeFilter);
      if (directionFilter !== 'all') params.set('direction', directionFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`${API_URL}/api/v1/edi-logs?${params}`);
      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, directionFilter, statusFilter, search, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fetchLogDetail = async (id: string) => {
    const res = await fetch(`${API_URL}/api/v1/edi-logs/${id}`);
    const json = await res.json();
    setSelectedLog(json.data);
  };

  const retryLog = async (id: string) => {
    await fetch(`${API_URL}/api/v1/edi-logs/${id}/retry`, { method: 'POST' });
    fetchLogs();
    setSelectedLog(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('EDI transaction log')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} {t('transactions')}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <CircleAlert className="h-5 w-5" />
          {error}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All types')}</SelectItem>
              <SelectItem value="850">{t('850 - Purchase Order')}</SelectItem>
              <SelectItem value="856">{t('856 - Ship Notice')}</SelectItem>
              <SelectItem value="204">{t('204 - Load Tender')}</SelectItem>
              <SelectItem value="990">{t('990 - Tender Response')}</SelectItem>
              <SelectItem value="997">{t('997 - Func. Ack')}</SelectItem>
              <SelectItem value="214">{t('214 - Status')}</SelectItem>
              <SelectItem value="210">{t('210 - Freight Invoice')}</SelectItem>
              <SelectItem value="810">{t('810 - Invoice')}</SelectItem>
              <SelectItem value="820">{t('820 - Payment')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={directionFilter} onValueChange={v => { setDirectionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All directions')}</SelectItem>
              <SelectItem value="inbound">{t('Inbound')}</SelectItem>
              <SelectItem value="outbound">{t('Outbound')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All statuses')}</SelectItem>
              <SelectItem value="success">{t('Success')}</SelectItem>
              <SelectItem value="error">{t('Error')}</SelectItem>
              <SelectItem value="pending">{t('Pending')}</SelectItem>
              <SelectItem value="processing">{t('Processing')}</SelectItem>
              <SelectItem value="duplicate">{t('Duplicate')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('Search by reference, filename...')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
        </div>

        <Separator />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Date')}</TableHead>
              <TableHead>{t('Partner')}</TableHead>
              <TableHead>{t('Type')}</TableHead>
              <TableHead>{t('Direction')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Reference')}</TableHead>
              <TableHead>{t('Source')}</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t('Loading...')}</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{t('No transactions found')}</TableCell></TableRow>
            ) : logs.map(log => (
              <TableRow key={log.id} onClick={() => fetchLogDetail(log.id)} className="cursor-pointer">
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                <TableCell>{log.partner?.name || '-'}</TableCell>
                <TableCell><span className="font-mono text-sm font-semibold">{log.transactionType}</span></TableCell>
                <TableCell>{DIRECTION_LABEL[log.direction] || log.direction}</TableCell>
                <TableCell><Badge variant={statusVariant(log.status)}>{log.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.shipmentReference || log.invoiceNumber || log.fileName || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.source || '-'}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  {log.status === 'error' && (
                    <Button size="sm" variant="outline" onClick={() => retryLog(log.id)}>
                      {t('Retry')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t('Previous')}</Button>
          <span className="text-sm text-muted-foreground">{t('Page')} {page + 1} {t('of')} {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={open => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle>{t('EDI')} {selectedLog.transactionType}- {DIRECTION_LABEL[selectedLog.direction]}</DialogTitle>
                <DialogDescription>
                  {t('Created')} {new Date(selectedLog.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">{t('Status:')}</span> <Badge variant={statusVariant(selectedLog.status)}>{selectedLog.status}</Badge></div>
                  <div><span className="font-medium">{t('Partner:')}</span> {selectedLog.partner?.name || t('None')}</div>
                  <div><span className="font-medium">{t('File:')}</span> {selectedLog.fileName || '-'}</div>
                  <div><span className="font-medium">{t('Size:')}</span> {selectedLog.fileSize ? `${selectedLog.fileSize} bytes` : '-'}</div>
                  <div><span className="font-medium">{t('Transport:')}</span> {selectedLog.transport || '-'}</div>
                  <div><span className="font-medium">{t('Source:')}</span> {selectedLog.source || '-'}</div>
                  <div><span className="font-medium">{t('Created:')}</span> {new Date(selectedLog.createdAt).toLocaleString()}</div>
                  <div><span className="font-medium">{t('Processed:')}</span> {selectedLog.processedAt ? new Date(selectedLog.processedAt).toLocaleString() : '-'}</div>
                  {selectedLog.shipmentReference && <div><span className="font-medium">{t('Shipment:')}</span> {selectedLog.shipmentReference}</div>}
                  {selectedLog.invoiceNumber && <div><span className="font-medium">{t('Invoice:')}</span> {selectedLog.invoiceNumber}</div>}
                  {selectedLog.entitiesCreated !== undefined && selectedLog.entitiesCreated > 0 && (
                    <div><span className="font-medium">{t('Entities created:')}</span> {selectedLog.entitiesCreated}</div>
                  )}
                  <div><span className="font-medium">{t('997 ack:')}</span> {selectedLog.ack997Sent ? t('Sent') : selectedLog.ack997Received ? 'Received' : 'None'}</div>
                  {selectedLog.retryCount !== undefined && selectedLog.retryCount > 0 && (
                    <div><span className="font-medium">{t('Retries:')}</span> {selectedLog.retryCount}</div>
                  )}
                </div>

                {selectedLog.errorMessage && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {selectedLog.errorMessage}
                  </div>
                )}

                {selectedLog.fileContent && (
                  <div>
                    <div className="mb-2 text-sm font-medium">{t('Raw EDI content')}</div>
                    <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
                      {selectedLog.fileContent}
                    </pre>
                  </div>
                )}
              </div>

              {selectedLog.status === 'error' && (
                <DialogFooter>
                  <Button variant="gradient" onClick={() => retryLog(selectedLog.id)}>
                    {t('Retry transaction')}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
