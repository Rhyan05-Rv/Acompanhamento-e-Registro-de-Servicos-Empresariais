import { prisma } from '../database/prisma.js'
import { AppError } from './errors.js'

export async function atualizarEtapa(
  empresaId: string,
  etapaId: string,
  data: { requerAprovacao: boolean }
) {
  const etapa = await prisma.etapaFluxo.findFirst({
    where: { id: etapaId, fluxo: { operacao: { empresaId } } },
  })
  if (!etapa) throw new AppError('Etapa não encontrada', 404)

  return prisma.etapaFluxo.update({
    where: { id: etapaId },
    data: { requerAprovacao: data.requerAprovacao },
    include: { equipe: { select: { id: true, nome: true } } },
  })
}
