import { CarReturnPayload, FlowDetailResponse } from '../types';

const GAS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLfksDjH_cNPhvO6gcDw8lWNRRtalwPXROnRgM1Hwexs02Zruh10XAZFq798KyiIn-rw/exec';
const N8N_CAR_WEBHOOK = 'https://n8n.srv1112305.hstgr.cloud/webhook-test/carfare';

export const submitCarReturn = async (payload: CarReturnPayload): Promise<{ ok: boolean }> => {
  const res = await fetch(N8N_CAR_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`n8n webhook error: ${res.status}`);
  }
  return res.json();
};

export const getFlowDetail = async (flowId: string): Promise<FlowDetailResponse> => {
  const res = await fetch(`${GAS_SCRIPT_URL}?action=flowDetail&flowId=${flowId}`);
  return res.json();
};
