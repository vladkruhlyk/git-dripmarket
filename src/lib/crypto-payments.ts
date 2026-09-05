import "server-only";

import { randomInt } from "node:crypto";
import { supabaseRequest } from "@/lib/supabase-server";
import { type TelegramOrder, notifyCryptoPaymentPaid } from "@/lib/telegram";

export type CryptoNetwork = "trc20" | "bep20";
export type CryptoPaymentStatus = "pending" | "detected" | "paid" | "expired" | "underpaid" | "manual_review";

export type CryptoPayment = {
  id: string;
  order_reference: string;
  status: CryptoPaymentStatus;
  currency: "USDT";
  network: CryptoNetwork | null;
  receiving_address: string | null;
  amount_usdt: string;
  amount_uah: number;
  tx_hash: string | null;
  expires_at: string;
  created_at: string;
  updated_at?: string;
  paid_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type StoredOrder = {
  order_reference: string;
  status: string;
  payment_status: string;
  total_uah: number;
  due_now_uah: number;
  payload: TelegramOrder;
};

type CreateCryptoPaymentInput = {
  order: TelegramOrder;
  amountUah: number;
};

type ChainMatch = {
  status: "detected" | "paid" | "underpaid" | "manual_review";
  txHash: string;
  amountRaw: string;
  amountUsdt: string;
  blockTimestamp: string;
  confirmations?: number;
  reason?: string;
};

const USDT_CONTRACTS: Record<CryptoNetwork, string> = {
  trc20: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
  bep20: "0x55d398326f99059fF775485246999027B3197955"
};

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const DEFAULT_INVOICE_TTL_MINUTES = 20;
const DEFAULT_BSC_CONFIRMATIONS = 12;

function getWallet(network: CryptoNetwork) {
  const value = network === "trc20"
    ? process.env.CRYPTO_TRC20_WALLET?.trim()
    : process.env.CRYPTO_BEP20_WALLET?.trim();
  if (!value) throw new Error(`Missing receiving wallet for ${network}`);
  return value;
}

function getUsdtRate() {
  const rate = Number(process.env.CRYPTO_USDT_UAH_RATE || process.env.USDT_UAH_RATE);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("CRYPTO_USDT_UAH_RATE is not configured");
  }
  return rate;
}

function getInvoiceTtlMinutes() {
  const ttl = Number(process.env.CRYPTO_INVOICE_TTL_MINUTES);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_INVOICE_TTL_MINUTES;
}

function getBscRpcUrl() {
  return process.env.BSC_RPC_URL?.trim() || "https://bsc-dataseed.binance.org";
}

function getBscConfirmations() {
  const confirmations = Number(process.env.BSC_CONFIRMATIONS);
  return Number.isFinite(confirmations) && confirmations >= 0 ? confirmations : DEFAULT_BSC_CONFIRMATIONS;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function cleanAmount(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function generateUniqueUsdtAmount(amountUah: number) {
  const base = cleanAmount(amountUah / getUsdtRate());
  const cents = randomInt(1, 99) / 100;
  return (Math.floor(base) + cents).toFixed(2);
}

function parseUnits(value: string, decimals: number) {
  const [whole, fraction = ""] = value.split(".");
  const padded = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(whole || "0") * (BigInt(10) ** BigInt(decimals)) + BigInt(padded || "0");
}

function formatUnits(raw: bigint, decimals: number) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function normalizeHexAddress(address: string) {
  return address.toLowerCase().replace(/^0x/, "");
}

function addressTopic(address: string) {
  return `0x${normalizeHexAddress(address).padStart(64, "0")}`;
}

async function storeOrder(order: TelegramOrder) {
  const rows = await supabaseRequest<StoredOrder[]>("/orders?on_conflict=order_reference", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: [{
      order_reference: order.orderReference,
      status: "created",
      payment_status: "pending",
      total_uah: Number(order.discountedTotal || order.total || 0),
      due_now_uah: Number(order.dueNow || 0),
      payload: order
    }]
  });

  return rows[0];
}

export async function createCryptoPayment({ order, amountUah }: CreateCryptoPaymentInput) {
  await storeOrder(order);
  const now = new Date();
  const rows = await supabaseRequest<CryptoPayment[]>("/crypto_payments", {
    method: "POST",
    prefer: "return=representation",
    body: [{
      order_reference: order.orderReference,
      status: "pending",
      currency: "USDT",
      amount_usdt: generateUniqueUsdtAmount(amountUah),
      amount_uah: amountUah,
      expires_at: addMinutes(now, getInvoiceTtlMinutes()).toISOString(),
      metadata: { source: "checkout" }
    }]
  });

  return rows[0];
}

export async function getCryptoPayment(id: string) {
  const rows = await supabaseRequest<CryptoPayment[]>(`/crypto_payments?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] || null;
}

export async function getOrder(orderReference: string) {
  const rows = await supabaseRequest<StoredOrder[]>(`/orders?order_reference=eq.${encodeURIComponent(orderReference)}&limit=1`);
  return rows[0] || null;
}

async function updateCryptoPayment(id: string, updates: Partial<CryptoPayment>) {
  const rows = await supabaseRequest<CryptoPayment[]>(`/crypto_payments?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: updates
  });
  return rows[0] || null;
}

async function updateOrderPaid(orderReference: string) {
  await supabaseRequest<StoredOrder[]>(`/orders?order_reference=eq.${encodeURIComponent(orderReference)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      status: "paid",
      payment_status: "paid",
      paid_at: new Date().toISOString()
    }
  });
}

async function txHashWasUsed(txHash: string, currentPaymentId: string) {
  const rows = await supabaseRequest<Array<{ id: string }>>(
    `/crypto_payments?tx_hash=eq.${encodeURIComponent(txHash)}&id=neq.${encodeURIComponent(currentPaymentId)}&limit=1`
  );
  return rows.length > 0;
}

async function checkTron(payment: CryptoPayment): Promise<ChainMatch | null> {
  const wallet = getWallet("trc20");
  const required = parseUnits(payment.amount_usdt, 6);
  const minTimestamp = Math.max(0, new Date(payment.created_at).getTime() - 120_000);
  const url = new URL(`https://api.trongrid.io/v1/accounts/${wallet}/transactions/trc20`);
  url.searchParams.set("only_confirmed", "true");
  url.searchParams.set("contract_address", USDT_CONTRACTS.trc20);
  url.searchParams.set("limit", "50");
  url.searchParams.set("min_timestamp", String(minTimestamp));

  const response = await fetch(url, {
    headers: process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : {},
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`TronGrid HTTP ${response.status}`);

  const payload = await response.json() as {
    data?: Array<{
      transaction_id?: string;
      token_info?: { address?: string; decimals?: number };
      to?: string;
      value?: string;
      block_timestamp?: number;
    }>;
  };

  for (const tx of payload.data || []) {
    const timestamp = Number(tx.block_timestamp || 0);
    const raw = BigInt(tx.value || "0");
    if (tx.token_info?.address !== USDT_CONTRACTS.trc20) continue;
    if (tx.to !== wallet) continue;
    if (timestamp < minTimestamp) continue;
    if (raw === required) {
      return {
        status: "paid",
        txHash: tx.transaction_id || "",
        amountRaw: raw.toString(),
        amountUsdt: formatUnits(raw, 6),
        blockTimestamp: new Date(timestamp).toISOString(),
        confirmations: 1
      };
    }
    if (raw > BigInt(0) && raw < required) {
      return {
        status: "underpaid",
        txHash: tx.transaction_id || "",
        amountRaw: raw.toString(),
        amountUsdt: formatUnits(raw, 6),
        blockTimestamp: new Date(timestamp).toISOString(),
        reason: "Amount is lower than invoice amount"
      };
    }
    if (raw > required) {
      return {
        status: "manual_review",
        txHash: tx.transaction_id || "",
        amountRaw: raw.toString(),
        amountUsdt: formatUnits(raw, 6),
        blockTimestamp: new Date(timestamp).toISOString(),
        reason: "Amount is higher than invoice amount"
      };
    }
  }

  return null;
}

async function bscRpc<T>(method: string, params: unknown[]) {
  const response = await fetch(getBscRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`BSC RPC HTTP ${response.status}`);
  const payload = await response.json() as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || "BSC RPC failed");
  return payload.result as T;
}

async function checkBsc(payment: CryptoPayment): Promise<ChainMatch | null> {
  const wallet = getWallet("bep20");
  const required = parseUnits(payment.amount_usdt, 18);
  const latestHex = await bscRpc<string>("eth_blockNumber", []);
  const latest = Number.parseInt(latestHex, 16);
  const fromBlock = Math.max(0, latest - 6000);
  const logs = await bscRpc<Array<{
    address: string;
    blockNumber: string;
    data: string;
    topics: string[];
    transactionHash: string;
  }>>("eth_getLogs", [{
    address: USDT_CONTRACTS.bep20,
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: "latest",
    topics: [TRANSFER_TOPIC, null, addressTopic(wallet)]
  }]);

  const minTimestamp = Math.floor((new Date(payment.created_at).getTime() - 120_000) / 1000);
  for (const log of logs || []) {
    if (log.address.toLowerCase() !== USDT_CONTRACTS.bep20.toLowerCase()) continue;
    const raw = BigInt(log.data);
    const blockNumber = Number.parseInt(log.blockNumber, 16);
    const block = await bscRpc<{ timestamp: string }>("eth_getBlockByNumber", [log.blockNumber, false]);
    const timestamp = Number.parseInt(block.timestamp, 16);
    if (timestamp < minTimestamp) continue;

    const confirmations = Math.max(0, latest - blockNumber);
    const baseMatch = {
      txHash: log.transactionHash,
      amountRaw: raw.toString(),
      amountUsdt: formatUnits(raw, 18),
      blockTimestamp: new Date(timestamp * 1000).toISOString(),
      confirmations
    };

    if (raw === required) {
      return confirmations >= getBscConfirmations()
        ? { status: "paid", ...baseMatch }
        : { status: "detected", ...baseMatch, reason: "Waiting for confirmations" };
    }
    if (raw > BigInt(0) && raw < required) {
      return {
        status: "underpaid",
        ...baseMatch,
        reason: "Amount is lower than invoice amount"
      };
    }
    if (raw > required) {
      return {
        status: "manual_review",
        ...baseMatch,
        reason: "Amount is higher than invoice amount"
      };
    }
  }

  return null;
}

export function getPublicCryptoPayment(payment: CryptoPayment) {
  return {
    id: payment.id,
    orderReference: payment.order_reference,
    status: payment.status,
    currency: payment.currency,
    network: payment.network,
    receivingAddress: payment.receiving_address,
    amountUsdt: payment.amount_usdt,
    amountUah: payment.amount_uah,
    txHash: payment.tx_hash,
    expiresAt: payment.expires_at,
    createdAt: payment.created_at,
    wallets: {
      trc20: getWallet("trc20"),
      bep20: getWallet("bep20")
    },
    contracts: USDT_CONTRACTS
  };
}

export async function checkCryptoPayment(id: string, network?: CryptoNetwork) {
  let payment = await getCryptoPayment(id);
  if (!payment) return null;

  if (payment.status === "paid") return payment;

  const now = new Date();
  if (now > new Date(payment.expires_at)) {
    return updateCryptoPayment(id, { status: "expired" }) || payment;
  }

  const selectedNetwork = network || payment.network;
  if (!selectedNetwork) return payment;

  const receivingAddress = getWallet(selectedNetwork);
  if (!payment.network || !payment.receiving_address) {
    payment = await updateCryptoPayment(id, {
      network: selectedNetwork,
      receiving_address: receivingAddress
    }) || payment;
  }

  const match = selectedNetwork === "trc20" ? await checkTron(payment) : await checkBsc(payment);
  if (!match) return payment;
  if (!match.txHash) return updateCryptoPayment(id, { status: "manual_review" }) || payment;
  if (await txHashWasUsed(match.txHash, id)) {
    return updateCryptoPayment(id, {
      status: "manual_review",
      metadata: { reason: "Transaction hash was already used", tx_hash: match.txHash }
    }) || payment;
  }

  const next = await updateCryptoPayment(id, {
    status: match.status,
    tx_hash: match.txHash,
    paid_at: match.status === "paid" ? new Date().toISOString() : null,
    metadata: {
      amount_raw: match.amountRaw,
      amount_usdt_detected: match.amountUsdt,
      block_timestamp: match.blockTimestamp,
      confirmations: match.confirmations,
      reason: match.reason || null
    }
  }) || payment;

  if (match.status === "paid") {
    await updateOrderPaid(payment.order_reference);
    const order = await getOrder(payment.order_reference);
    await notifyCryptoPaymentPaid(order?.payload || { orderReference: payment.order_reference }, next);
  }

  return next;
}
