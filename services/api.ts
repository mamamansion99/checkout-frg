import { CarReturnPayload, FlowDetailResponse } from '../types';

const GAS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLfksDjH_cNPhvO6gcDw8lWNRRtalwPXROnRgM1Hwexs02Zruh10XAZFq798KyiIn-rw/exec';
const N8N_FRIDGE_WEBHOOK = 'https://n8n.srv1112305.hstgr.cloud/webhook/carfare';

export const submitCarReturn = async (
  payload: CarReturnPayload
): Promise<{ ok: boolean; [key: string]: any }> => {
  const res = await fetch(N8N_FRIDGE_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`n8n webhook error: ${res.status} ${rawText}`);
  }

  // Handle cases where webhook returns plain text or empty body
  if (!rawText) {
    return { ok: true };
  }

  try {
    const data = JSON.parse(rawText);
    return typeof data.ok === 'boolean' ? data : { ok: true, ...data };
  } catch {
    return { ok: true, raw: rawText };
  }
};

export const getFlowDetail = async (flowId: string): Promise<FlowDetailResponse> => {
  const res = await fetch(`${GAS_SCRIPT_URL}?action=flowDetail&flowId=${flowId}`);
  return res.json();
};
