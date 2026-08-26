import asyncHandler from '../utils/asyncHandler.js';
import { createSurprise, deleteSurprise, duplicateSurprise, getSurprise, listSurprises, toPublicSurprise, updateSurprise } from '../services/surpriseService.js';

export const create = asyncHandler(async (req, res) => {
  const surprise = await createSurprise(req.user._id, req.body);
  res.status(201).json({ success: true, data: { surprise: toPublicSurprise(surprise) } });
});
export const list = asyncHandler(async (req, res) => {
  const { surprises, meta } = await listSurprises(req.user._id, req.query);
  res.status(200).json({ success: true, data: { surprises: surprises.map(toPublicSurprise) }, meta });
});
export const getById = asyncHandler(async (req, res) => {
  const surprise = await getSurprise(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: { surprise: toPublicSurprise(surprise) } });
});
export const update = asyncHandler(async (req, res) => {
  const surprise = await updateSurprise(req.params.id, req.user._id, req.body);
  res.status(200).json({ success: true, data: { surprise: toPublicSurprise(surprise) } });
});
export const remove = asyncHandler(async (req, res) => {
  await deleteSurprise(req.params.id, req.user._id);
  res.status(200).json({ success: true, data: { message: 'Surprise deleted.' } });
});
export const duplicate = asyncHandler(async (req, res) => {
  const surprise = await duplicateSurprise(req.params.id, req.user._id);
  res.status(201).json({ success: true, data: { surprise: toPublicSurprise(surprise) } });
});
