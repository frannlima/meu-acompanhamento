/** Núcleo independente para seleção de avatar por filial.
 * Integração com autenticação, Supabase e componentes existentes deve ser feita
 * após identificação da arquitetura do app.
 */
export const AVATAR_STATES = Object.freeze({
  CELEBRATE: 'celebrate',
  TRACKING: 'tracking',
  ATTENTION: 'attention',
  REACT: 'react',
  STALE: 'stale',
});
export function normalizeBranchCode(value) {
  const code = String(value ?? '').trim();
  if (!/^\\d{1,6}$/.test(code)) return null;
  return code.padStart(3, '0');
}
export function selectAvatarState({ projection, curve, lastUpdatedAt, now = Date.now(), staleAfterMinutes = 30 }) {
  const timestamp = lastUpdatedAt ? new Date(lastUpdatedAt).getTime() : NaN;
  if (!Number.isFinite(timestamp) || now - timestamp > staleAfterMinutes * 60000 || timestamp > now + 60000)
    return AVATAR_STATES.STALE;
  if (!Number.isFinite(projection) || !Number.isFinite(curve)) return AVATAR_STATES.STALE;
  if (projection >= 100 && curve >= 100) return AVATAR_STATES.CELEBRATE;
  if (projection >= 100) return AVATAR_STATES.TRACKING;
  if (projection >= 90) return AVATAR_STATES.ATTENTION;
  return AVATAR_STATES.REACT;
}
export function resolveAvatarImage(record, state, fallbackUrl = null) {
  if (!record?.enabled) return fallbackUrl;
  const images = record.images || {};
  return images[state] || images.tracking || images.original || fallbackUrl;
}
export function getAvatarMessage(state) {
  return ({
    celebrate: 'Excelente! Estamos acima da curva!',
    tracking: 'Vamos manter o ritmo!',
    attention: 'Atenção ao resultado!',
    react: 'Precisamos reagir!',
    stale: 'Atualize a parcial de vendas.',
  })[state] || 'Acompanhe o resultado.';
}
