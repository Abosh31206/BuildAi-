export default function handler(req: any, res: any) {
  const q = ((req.query?.q as string) || '').toLowerCase().trim();
  return res.status(200).json({
    status: 'ok',
    query: q,
    timestamp: new Date().toISOString(),
  });
}
