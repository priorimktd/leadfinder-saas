import { StoredLead } from './db.js';

export class PitchGenerator {
  static generatePitch(lead: StoredLead, templateType: 'autoridade' | 'mockup' | 'agendamento' = 'autoridade'): string {
    const name = lead.name;
    const rating = lead.rating ? lead.rating.toFixed(1) : 'excelente';
    const reviews = lead.reviewCount > 0 ? `${lead.reviewCount} avaliações` : 'ótimas avaliações';
    const category = lead.category || 'estabelecimento';

    if (lead.websiteStatus === 'SEM_SITE') {
      switch (templateType) {
        case 'mockup':
          return `Olá pessoal da ${name}, tudo bem?\n\n` +
            `Estava pesquisando ${category} aqui na região e vi que vocês têm uma nota incrível de ${rating} estrelas no Google com ${reviews}!\n\n` +
            `Notei também que vocês ainda não possuem um site oficial para captar clientes que buscam no Google. Desenvolvi um modelo inicial de como ficaria um site moderno e profissional para a ${name}.\n\n` +
            `Posso te enviar uma foto/demonstração por aqui sem compromisso?`;

        case 'agendamento':
          return `Olá equipe da ${name}, como estão?\n\n` +
            `Encontrei o perfil de vocês no Google Maps com nota ${rating} ⭐ (${reviews}). Parabéns pelo excelente trabalho!\n\n` +
            `Reparei que vocês ainda não têm uma página própria com botão direto para agendamento online e catálogo de serviços. Sabia que mais de 60% das pessoas que buscam no Google desistem se não encontram um site claro?\n\n` +
            `Gostaria de ver como estruturar isso para dobrar o contato de novos clientes?`;

        case 'autoridade':
        default:
          return `Olá, tudo bem? Falo com o responsável pela ${name}?\n\n` +
            `Vi o destaque de vocês no Google com nota ${rating} e ${reviews}. O atendimento de vocês parece ser excelente!\n\n` +
            `Porém, percebi que quando os clientes clicam no perfil de vocês no Maps, não encontram um site oficial cadastrado, o que faz muitos acabarem indo para concorrentes.\n\n` +
            `Trabalhamos criando sites profissionais otimizados para converter essas buscas em clientes no WhatsApp. Teria 3 minutinhos para eu te mostrar uma prévia rápida?`;
      }
    } else if (lead.websiteStatus === 'APENAS_REDES_SOCIAIS') {
      return `Olá pessoal da ${name}, tudo bem?\n\n` +
        `Estava vendo o perfil de vocês no Google com nota ${rating} ⭐ e notei que o link principal de vocês aponta apenas para rede social.\n\n` +
        `Ter uma página própria e institucional passa 3x mais autoridade e permite que o cliente compre/agende diretamente sem distrações do feed.\n\n` +
        `Se fizer sentido, posso te apresentar um modelo pensado exclusivamente para o nicho de vocês. Como está a sua semana para trocarmos uma ideia rápida?`;
    } else {
      return `Olá pessoal da ${name}, tudo bem?\n\n` +
        `Parabéns pelo trabalho e pela nota ${rating} ⭐ no Google (${reviews}).\n\n` +
        `Estive analisando a presença digital de vocês e identifiquei algumas melhorias importantes de velocidade, SEO e botão de WhatsApp que podem aumentar suas conversões em até 40%.\n\n` +
        `Gostaria de receber um diagnóstico rápido e gratuito?`;
    }
  }
}