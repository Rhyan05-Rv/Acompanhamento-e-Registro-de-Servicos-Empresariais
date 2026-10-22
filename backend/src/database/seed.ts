import '../env.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const dias = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

async function seed() {
  const senha = await bcrypt.hash('123456', 10)

  async function empresa(id: string, nome: string) {
    return prisma.empresa.upsert({ where: { id }, update: { nome }, create: { id, nome } })
  }
  async function operacao(id: string, empresaId: string, nome: string, descricao?: string) {
    return prisma.operacao.upsert({
      where: { id },
      update: { empresaId, nome, descricao },
      create: { id, empresaId, nome, descricao },
    })
  }
  async function depto(id: string, operacaoId: string, nome: string) {
    return prisma.departamento.upsert({ where: { id }, update: { operacaoId, nome }, create: { id, operacaoId, nome } })
  }
  async function user(email: string, nome: string, funcao: string, nivelAcesso: string, empresaId: string) {
    return prisma.usuario.upsert({
      where: { email },
      update: { empresaId, nome, funcao, nivelAcesso },
      create: { email, nome, funcao, nivelAcesso, empresaId, senha },
    })
  }
  async function membro(operacaoId: string, usuarioId: string, departamentoId: string, papel = 'operacional') {
    return prisma.operacaoMembro.upsert({
      where: { operacaoId_usuarioId: { operacaoId, usuarioId } },
      update: { departamentoId, papel },
      create: { operacaoId, usuarioId, departamentoId, papel },
    })
  }
  async function fluxo(
    id: string,
    operacaoId: string,
    nome: string,
    descricao: string,
    etapas: { id: string; nome: string; equipeId: string }[]
  ) {
    await prisma.fluxo.upsert({
      where: { id },
      update: { operacaoId, nome, descricao },
      create: { id, operacaoId, nome, descricao },
    })
    const mapa: { id: string; equipeId: string }[] = []
    for (let i = 0; i < etapas.length; i++) {
      const e = etapas[i]
      const requerAprovacao = ['Forno', 'Expedição'].includes(e.nome)
      await prisma.etapaFluxo.upsert({
        where: { fluxoId_ordem: { fluxoId: id, ordem: i + 1 } },
        update: { nome: e.nome, equipeId: e.equipeId, requerAprovacao },
        create: {
          id: e.id,
          fluxoId: id,
          ordem: i + 1,
          nome: e.nome,
          equipeId: e.equipeId,
          requerAprovacao,
        },
      })
      mapa.push({ id: e.id, equipeId: e.equipeId })
    }
    return mapa
  }

  function trilha(etapas: { id: string }[], ateOrdem: number, atores: string[], criadorId: string) {
    const movs: any[] = []
    let origem: string | null = null
    for (let j = 0; j < ateOrdem; j++) {
      movs.push({
        etapaOrigemId: origem,
        etapaDestinoId: etapas[j].id,
        tipo: origem ? 'avanco' : 'criacao',
        movidoPorId: origem ? atores[j - 1] : criadorId,
      })
      origem = etapas[j].id
    }
    return movs
  }

  async function criarAtividade(dados: any) {
    const { movs, ...rest } = dados
    const atividade = await prisma.atividade.create({ data: rest })
    await prisma.atividadeResponsavel.create({
      data: { atividadeId: atividade.id, usuarioId: rest.responsavelId },
    })
    for (const m of movs ?? []) {
      await prisma.movimentacaoEtapa.create({ data: { ...m, atividadeId: atividade.id } })
    }
    return atividade
  }

  // ================= EMPRESAS =================
  const aurora = await empresa('e0000000-0000-0000-0000-000000000001', 'Confeitaria Aurora')
  const beta = await empresa('e0000000-0000-0000-0000-000000000002', 'Distribuidora Beta')

  // ================= OPERAÇÕES =================
  const opBolo = await operacao('0a000000-0000-0000-0000-000000000001', aurora.id, 'Produção de Bolo', 'Mistura → Forma → Forno → Finalização')
  const opLog = await operacao('0a000000-0000-0000-0000-000000000002', aurora.id, 'Logística de Vendas', 'Separação → Expedição → Entrega')
  const opAtend = await operacao('0a000000-0000-0000-0000-000000000003', aurora.id, 'Atendimento ao Cliente', 'Recepção → Suporte → Pós-venda')
  const opEstoque = await operacao('0a000000-0000-0000-0000-000000000004', beta.id, 'Controle de Estoque', 'Recebimento → Armazenagem')
  const opDist = await operacao('0a000000-0000-0000-0000-000000000005', beta.id, 'Distribuição Regional', 'Roteirização → Carregamento')

  // ================= EQUIPES =================
  const mistura = await depto('d0000000-0000-0000-0000-000000000001', opBolo.id, 'Mistura')
  const forma = await depto('d0000000-0000-0000-0000-000000000002', opBolo.id, 'Montagem de Forma')
  const forno = await depto('d0000000-0000-0000-0000-000000000003', opBolo.id, 'Forno')
  const finalizacao = await depto('d0000000-0000-0000-0000-000000000004', opBolo.id, 'Finalização')
  const separacao = await depto('d0000000-0000-0000-0000-000000000005', opLog.id, 'Separação')
  const expedicao = await depto('d0000000-0000-0000-0000-000000000006', opLog.id, 'Expedição')
  const entrega = await depto('d0000000-0000-0000-0000-000000000007', opLog.id, 'Entregas')
  const recepcao = await depto('d0000000-0000-0000-0000-000000000008', opAtend.id, 'Recepção de Pedidos')
  const suporte = await depto('d0000000-0000-0000-0000-000000000009', opAtend.id, 'Suporte')
  const posvenda = await depto('d0000000-0000-0000-0000-000000000010', opAtend.id, 'Pós-venda')
  const recebimento = await depto('d0000000-0000-0000-0000-000000000011', opEstoque.id, 'Recebimento')
  const armazenagem = await depto('d0000000-0000-0000-0000-000000000012', opEstoque.id, 'Armazenagem')
  const roteirizacao = await depto('d0000000-0000-0000-0000-000000000013', opDist.id, 'Roteirização')
  const carregamento = await depto('d0000000-0000-0000-0000-000000000014', opDist.id, 'Carregamento')

  // ================= USUÁRIOS =================
  const adminAurora = await user('admin@aurora.com', 'Administrador Aurora', 'Gestor Geral', 'gestor', aurora.id)
  const f1 = await user('funcionario1@aurora.com', 'Ana Mistura', 'Auxiliar de Mistura', 'operacional', aurora.id)
  const f2 = await user('funcionario2@aurora.com', 'Bruno Formas', 'Montador de Forma', 'operacional', aurora.id)
  const f3 = await user('funcionario3@aurora.com', 'Carla Forno', 'Operadora de Forno', 'operacional', aurora.id)
  const f4 = await user('funcionario4@aurora.com', 'Diego Finalização', 'Confeiteiro Finalizador', 'operacional', aurora.id)
  const f5 = await user('funcionario5@aurora.com', 'Elisa Separação', 'Separadora de Pedidos', 'operacional', aurora.id)
  const f6 = await user('funcionario6@aurora.com', 'Felipe Expedição', 'Expedidor', 'operacional', aurora.id)
  const f7 = await user('funcionario7@aurora.com', 'Gabi Entregas', 'Motorista', 'operacional', aurora.id)
  const f8 = await user('funcionario8@aurora.com', 'Hugo Recepção', 'Atendente de Pedidos', 'operacional', aurora.id)
  const f9 = await user('funcionario9@aurora.com', 'Iara Suporte', 'Analista de Suporte', 'operacional', aurora.id)
  const f10 = await user('funcionario10@aurora.com', 'João Pós-venda', 'Analista de Pós-venda', 'operacional', aurora.id)

  const adminBeta = await user('admin@beta.com', 'Administrador Beta', 'Gestor Geral', 'gestor', beta.id)
  const b1 = await user('funcionario1@beta.com', 'Beta Recebedor', 'Conferente', 'operacional', beta.id)
  const b2 = await user('funcionario2@beta.com', 'Beta Armazenador', 'Auxiliar de Estoque', 'operacional', beta.id)
  const b3 = await user('funcionario3@beta.com', 'Beta Roteirizador', 'Analista de Roteirização', 'operacional', beta.id)
  const b4 = await user('funcionario4@beta.com', 'Beta Carregador', 'Operador de Carregamento', 'operacional', beta.id)

  // ================= VÍNCULOS =================
  await membro(opBolo.id, f1.id, mistura.id)
  await membro(opBolo.id, f2.id, forma.id)
  await membro(opBolo.id, f3.id, forno.id)
  await membro(opBolo.id, f4.id, finalizacao.id)
  await membro(opLog.id, f5.id, separacao.id)
  await membro(opLog.id, f6.id, expedicao.id)
  await membro(opLog.id, f7.id, entrega.id)
  await membro(opAtend.id, f8.id, recepcao.id)
  await membro(opAtend.id, f9.id, suporte.id)
  await membro(opAtend.id, f10.id, posvenda.id)
  await membro(opBolo.id, adminAurora.id, mistura.id, 'gestor')
  await membro(opLog.id, adminAurora.id, separacao.id, 'gestor')
  await membro(opAtend.id, adminAurora.id, recepcao.id, 'gestor')
  await membro(opEstoque.id, b1.id, recebimento.id)
  await membro(opEstoque.id, b2.id, armazenagem.id)
  await membro(opDist.id, b3.id, roteirizacao.id)
  await membro(opDist.id, b4.id, carregamento.id)
  await membro(opEstoque.id, adminBeta.id, recebimento.id, 'gestor')
  await membro(opDist.id, adminBeta.id, roteirizacao.id, 'gestor')

  // ================= FLUXOS =================
  const boloEtapas = await fluxo('f0000000-0000-0000-0000-000000000001', opBolo.id, 'Produção de Bolo', 'Mistura → Montagem de Forma → Forno → Finalização', [
    { id: 'a0000000-0000-0000-0000-000000000001', nome: 'Mistura', equipeId: mistura.id },
    { id: 'a0000000-0000-0000-0000-000000000002', nome: 'Montagem de Forma', equipeId: forma.id },
    { id: 'a0000000-0000-0000-0000-000000000003', nome: 'Forno', equipeId: forno.id },
    { id: 'a0000000-0000-0000-0000-000000000004', nome: 'Finalização', equipeId: finalizacao.id },
  ])
  const logEtapas = await fluxo('f0000000-0000-0000-0000-000000000002', opLog.id, 'Ciclo de Pedido', 'Separação → Expedição → Entrega', [
    { id: 'a0000000-0000-0000-0000-000000000005', nome: 'Separação', equipeId: separacao.id },
    { id: 'a0000000-0000-0000-0000-000000000006', nome: 'Expedição', equipeId: expedicao.id },
    { id: 'a0000000-0000-0000-0000-000000000007', nome: 'Entrega', equipeId: entrega.id },
  ])
  const atendEtapas = await fluxo('f0000000-0000-0000-0000-000000000003', opAtend.id, 'Atendimento', 'Recepção → Suporte → Pós-venda', [
    { id: 'a0000000-0000-0000-0000-000000000008', nome: 'Recepção', equipeId: recepcao.id },
    { id: 'a0000000-0000-0000-0000-000000000009', nome: 'Suporte', equipeId: suporte.id },
    { id: 'a0000000-0000-0000-0000-000000000010', nome: 'Pós-venda', equipeId: posvenda.id },
  ])
  const estoqueEtapas = await fluxo('f0000000-0000-0000-0000-000000000004', opEstoque.id, 'Fluxo de Estoque', 'Recebimento → Armazenagem', [
    { id: 'a0000000-0000-0000-0000-000000000011', nome: 'Recebimento', equipeId: recebimento.id },
    { id: 'a0000000-0000-0000-0000-000000000012', nome: 'Armazenagem', equipeId: armazenagem.id },
  ])
  const distEtapas = await fluxo('f0000000-0000-0000-0000-000000000005', opDist.id, 'Distribuição', 'Roteirização → Carregamento', [
    { id: 'a0000000-0000-0000-0000-000000000013', nome: 'Roteirização', equipeId: roteirizacao.id },
    { id: 'a0000000-0000-0000-0000-000000000014', nome: 'Carregamento', equipeId: carregamento.id },
  ])

  // ================= ATIVIDADES =================
  function card(
    operacaoId: string,
    fluxoId: string,
    etapas: { id: string; equipeId: string }[],
    atores: string[],
    criadorId: string,
    dados: {
      titulo: string
      descricao: string
      ordem: number
      responsavel: string
      status: string
      prioridade?: string
      extra?: any
    }
  ) {
    const ordem = dados.ordem
    return criarAtividade({
      operacaoId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      responsavelId: dados.responsavel,
      criadoPorId: criadorId,
      equipeId: etapas[ordem - 1].equipeId,
      fluxoId,
      etapaAtualId: etapas[ordem - 1].id,
      status: dados.status,
      prioridade: dados.prioridade ?? 'media',
      prazoEstimado: dias(-5),
      ...(dados.extra ?? {}),
      movs: trilha(etapas, ordem, atores, criadorId),
    })
  }

  const boloAtores = [f1.id, f2.id, f3.id]
  const logAtores = [f5.id, f6.id]
  const atendAtores = [f8.id, f9.id]
  const estAtores = [b1.id]
  const distAtores = [b3.id]

  const bolo = (titulo: string, ordem: number, responsavel: string, status: string, extra: any = {}, prioridade = 'alta') =>
    card(opBolo.id, 'f0000000-0000-0000-0000-000000000001', boloEtapas, boloAtores, adminAurora.id, {
      titulo, descricao: 'Encomenda da produção de bolo', ordem, responsavel, status, prioridade, extra,
    })
  const pedido = (titulo: string, ordem: number, responsavel: string, status: string, extra: any = {}, prioridade = 'media') =>
    card(opLog.id, 'f0000000-0000-0000-0000-000000000002', logEtapas, logAtores, adminAurora.id, {
      titulo, descricao: 'Pedido de venda', ordem, responsavel, status, prioridade, extra,
    })
  const atendimento = (titulo: string, ordem: number, responsavel: string, status: string, extra: any = {}, prioridade = 'media') =>
    card(opAtend.id, 'f0000000-0000-0000-0000-000000000003', atendEtapas, atendAtores, adminAurora.id, {
      titulo, descricao: 'Solicitação de cliente', ordem, responsavel, status, prioridade, extra,
    })
  const estoqueCard = (titulo: string, ordem: number, responsavel: string, status: string, extra: any = {}, prioridade = 'media') =>
    card(opEstoque.id, 'f0000000-0000-0000-0000-000000000004', estoqueEtapas, estAtores, adminBeta.id, {
      titulo, descricao: 'Movimentação de estoque', ordem, responsavel, status, prioridade, extra,
    })
  const distCard = (titulo: string, ordem: number, responsavel: string, status: string, extra: any = {}, prioridade = 'media') =>
    card(opDist.id, 'f0000000-0000-0000-0000-000000000005', distEtapas, distAtores, adminBeta.id, {
      titulo, descricao: 'Rota de distribuição', ordem, responsavel, status, prioridade, extra,
    })

  // --- Produção de Bolo ---
  const a1 = await bolo('Bolo de chocolate #001', 3, f3.id, 'em_execucao', { dataInicio: dias(2) }, 'urgente')
  const a2 = await bolo('Bolo de cenoura #002', 3, f3.id, 'bloqueado', { dataInicio: dias(3) })
  await bolo('Bolo de morango #003', 1, f1.id, 'pendente', {})
  await bolo('Torta de limão #004', 4, f4.id, 'concluido', { dataInicio: dias(6), dataConclusao: dias(1), tempoGastoMin: 7200 })
  await bolo('Bolo red velvet #005', 2, f2.id, 'revisao', { dataInicio: dias(1) })
  await bolo('Bolo de prestígio #006', 4, f4.id, 'concluido', { dataInicio: dias(8), dataConclusao: dias(2), tempoGastoMin: 8640 })
  await bolo('Bolo de fubá #007', 1, f1.id, 'pendente', {}, 'baixa')
  await bolo('Bolo de laranja #008', 3, f3.id, 'em_execucao', { dataInicio: dias(1) })
  await bolo('Bolo de aipim #009', 2, f2.id, 'em_execucao', { dataInicio: dias(2) }, 'alta')
  await bolo('Bolo de ninho #010', 1, f1.id, 'pendente', {}, 'alta')
  await bolo('Bolo de brigadeiro #011', 4, f4.id, 'concluido', { dataInicio: dias(10), dataConclusao: dias(4), tempoGastoMin: 8640 })
  await bolo('Bolo de milho #012', 2, f2.id, 'pendente', {})

  // --- Logística de Vendas ---
  const p1 = await pedido('Pedido #101', 2, f6.id, 'em_execucao', { dataInicio: dias(1) }, 'alta')
  const p2 = await pedido('Pedido #102', 1, f5.id, 'concluido', { dataInicio: dias(4), dataConclusao: dias(2), tempoGastoMin: 2880 })
  await pedido('Pedido #103', 1, f5.id, 'pendente')
  await pedido('Pedido #104', 3, f7.id, 'concluido', { dataInicio: dias(7), dataConclusao: dias(1), tempoGastoMin: 8640 })
  await pedido('Pedido #105', 2, f6.id, 'bloqueado', { dataInicio: dias(2) }, 'urgente')
  await pedido('Pedido #106', 3, f7.id, 'em_execucao', { dataInicio: dias(1) })
  await pedido('Pedido #107', 1, f5.id, 'pendente', {}, 'baixa')
  await pedido('Pedido #108', 1, f5.id, 'concluido', { dataInicio: dias(5), dataConclusao: dias(3), tempoGastoMin: 2880 })

  // --- Atendimento ao Cliente ---
  await atendimento('Chamado #201 - Troca de sabor', 2, f9.id, 'em_execucao', { dataInicio: dias(1) })
  await atendimento('Chamado #202 - Prazo de entrega', 1, f8.id, 'concluido', { dataInicio: dias(3), dataConclusao: dias(2), tempoGastoMin: 1440 })
  await atendimento('Chamado #203 - Elogio', 3, f10.id, 'concluido', { dataInicio: dias(6), dataConclusao: dias(4), tempoGastoMin: 2880 })
  await atendimento('Chamado #204 - Reclamação de atraso', 1, f8.id, 'pendente', {}, 'alta')
  await atendimento('Chamado #205 - Dúvida de ingredientes', 2, f9.id, 'revisao', { dataInicio: dias(1) })
  await atendimento('Chamado #206 - Cancelamento', 1, f8.id, 'bloqueado', { dataInicio: dias(2) }, 'urgente')
  await atendimento('Chamado #207 - Orçamento corporativo', 3, f10.id, 'em_execucao', { dataInicio: dias(1) })

  // --- Controle de Estoque (Beta) ---
  await estoqueCard('Receber nota fiscal #5501', 1, b1.id, 'em_execucao', { dataInicio: dias(1) }, 'alta')
  await estoqueCard('Inventário cíclico - corredor B', 2, b2.id, 'pendente', {}, 'baixa')
  await estoqueCard('Receber nota fiscal #5502', 1, b1.id, 'concluido', { dataInicio: dias(4), dataConclusao: dias(3), tempoGastoMin: 1440 })
  await estoqueCard('Ajuste de endereçamento', 2, b2.id, 'em_execucao', { dataInicio: dias(2) })
  await estoqueCard('Devolução de fornecedor', 1, b1.id, 'bloqueado', { dataInicio: dias(1) }, 'urgente')

  // --- Distribuição Regional (Beta) ---
  await distCard('Rota 12 - Zona Norte', 2, b4.id, 'em_execucao', { dataInicio: dias(1) }, 'alta')
  await distCard('Rota 13 - Zona Sul', 1, b3.id, 'pendente')
  await distCard('Rota 14 - Centro', 2, b4.id, 'concluido', { dataInicio: dias(5), dataConclusao: dias(3), tempoGastoMin: 2880 })
  await distCard('Rota 15 - Interior', 1, b3.id, 'revisao', { dataInicio: dias(1) })
  await distCard('Rota 16 - Litoral', 1, b3.id, 'pendente', {}, 'baixa')

  // responsáveis extras (demonstra múltiplos responsáveis por card)
  for (const [atividadeId, usuarioId] of [
    [a1.id, f4.id],
    [a2.id, f2.id],
    [p1.id, f7.id],
    [p2.id, f6.id],
  ] as [string, string][]) {
    await prisma.atividadeResponsavel.upsert({
      where: { atividadeId_usuarioId: { atividadeId, usuarioId } },
      update: {},
      create: { atividadeId, usuarioId },
    })
  }

  // ================= CASOS =================
  const casos: any[] = [
    { operacaoId: opBolo.id, titulo: 'Máquina explodiu', descricao: 'Forno apresentou pane elétrica durante o assamento do lote #002.', status: 'em_analise', atividadeId: a2.id, equipeId: forno.id, registradoPorId: f3.id, anexo: { nome: 'laudo-tecnico.pdf', caminho: 'uploads/demo-laudo.pdf', mime: 'application/pdf' } },
    { operacaoId: opBolo.id, titulo: 'Pegou fogo', descricao: 'Princípio de incêndio contido pela brigada. Sem feridos.', status: 'aberto', equipeId: forno.id, registradoPorId: f3.id },
    { operacaoId: opBolo.id, titulo: 'Problema na entrega de material', descricao: 'Farinha entregue fora do prazo atrasou a etapa de Mistura.', status: 'resolvido', atividadeId: a1.id, equipeId: mistura.id, registradoPorId: f1.id },
    { operacaoId: opBolo.id, titulo: 'Massa fora do ponto', descricao: 'Lote de massa com textura inadequada precisou ser refeito.', status: 'aberto', equipeId: mistura.id, registradoPorId: f1.id },
    { operacaoId: opLog.id, titulo: 'Atraso na expedição', descricao: 'Transportadora não compareceu no horário agendado.', status: 'em_analise', atividadeId: p1.id, equipeId: expedicao.id, registradoPorId: f6.id },
    { operacaoId: opLog.id, titulo: 'Pedido trocado', descricao: 'Cliente #102 recebeu item divergente do pedido.', status: 'aberto', atividadeId: p2.id, equipeId: entrega.id, registradoPorId: f7.id },
    { operacaoId: opLog.id, titulo: 'Caminhão quebrado', descricao: 'Veículo de entrega apresentou falha mecânica na saída.', status: 'resolvido', equipeId: entrega.id, registradoPorId: f7.id },
    { operacaoId: opAtend.id, titulo: 'Reclamação grave no Reclame Aqui', descricao: 'Cliente publicou reclamação sobre atraso recorrente.', status: 'em_analise', equipeId: suporte.id, registradoPorId: f9.id },
    { operacaoId: opEstoque.id, titulo: 'Divergência de inventário', descricao: 'Contagem física difere do sistema em 3 unidades.', status: 'resolvido', equipeId: armazenagem.id, registradoPorId: b2.id },
    { operacaoId: opEstoque.id, titulo: 'Palete danificado', descricao: 'Palete tombado durante movimentação interna.', status: 'aberto', equipeId: recebimento.id, registradoPorId: b1.id },
    { operacaoId: opDist.id, titulo: 'Rota bloqueada', descricao: 'Interdição de via obrigou remanejamento da rota 12.', status: 'em_analise', equipeId: roteirizacao.id, registradoPorId: b3.id },
  ]

  for (const c of casos) {
    const { anexo, ...rest } = c
    await prisma.caso.create({
      data: { ...rest, ...(anexo ? { anexos: { create: [anexo] } } : {}) },
    })
  }

  // ================= PLAYBOOK DEMO =================
  const playbookId = 'b0000000-0000-0000-0000-000000000001'
  await prisma.playbook.upsert({
    where: { id: playbookId },
    update: { nome: 'Produção de bolo padrão', descricao: 'Checklist de uma encomenda padrão', operacaoId: opBolo.id, empresaId: aurora.id, criadoPorId: adminAurora.id, frequencia: 'semanal', proximaEm: new Date(Date.now() + 7 * 86400000) },
    create: {
      id: playbookId,
      empresaId: aurora.id,
      operacaoId: opBolo.id,
      criadoPorId: adminAurora.id,
      nome: 'Produção de bolo padrão',
      descricao: 'Checklist de uma encomenda padrão',
      frequencia: 'semanal',
      proximaEm: new Date(Date.now() + 7 * 86400000),
    },
  })
  await prisma.playbookItem.deleteMany({ where: { playbookId } })
  await prisma.playbookItem.createMany({
    data: [
      { playbookId, titulo: 'Conferir ingredientes', prioridade: 'alta', equipeId: mistura.id, etapaId: boloEtapas[0].id, offsetDias: 0, ordem: 0 },
      { playbookId, titulo: 'Montar a forma', prioridade: 'media', equipeId: forma.id, etapaId: boloEtapas[1].id, offsetDias: 1, ordem: 1 },
      { playbookId, titulo: 'Assar o lote', prioridade: 'alta', equipeId: forno.id, etapaId: boloEtapas[2].id, offsetDias: 2, ordem: 2 },
      { playbookId, titulo: 'Finalizar e embalar', prioridade: 'media', equipeId: finalizacao.id, etapaId: boloEtapas[3].id, offsetDias: 3, ordem: 3 },
    ],
  })

  console.log('Seed concluído!')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
