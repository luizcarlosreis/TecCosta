'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function ClassificacaoPage() {
  const [activeTab, setActiveTab] = useState<'operacionais' | 'emergenciais'>('operacionais');

  const operacionaisCategories = [
    {
      title: 'Elétrica',
      icon: '⚡',
      items: [
        'Iluminação não emergencial',
        'Conserto de tomadas',
        'Interfone',
        'Antena',
        'Luz piloto',
        'Manutenção preventiva'
      ]
    },
    {
      title: 'Câmeras',
      icon: '📹',
      items: [
        'Manutenção preventiva',
        'Ajustes de imagem',
        'Troca de cabos/conectores',
        'Instalação de novas câmeras'
      ]
    },
    {
      title: 'Cerca Elétrica',
      icon: '🛑',
      items: [
        'Problemas no funcionamento',
        'Limpeza de isoladores',
        'Troca de fios danificados'
      ]
    },
    {
      title: 'Antenas',
      icon: '📡',
      items: [
        'Problemas no funcionamento',
        'Substituição de cabeamento',
        'Ajustes de sinal'
      ]
    },
    {
      title: 'Interfone',
      icon: '📞',
      items: [
        'Problemas no funcionamento',
        'Substituição de cabeamento',
        'Ajustes de sinal'
      ]
    },
    {
      title: 'Luz Piloto',
      icon: '💡',
      items: [
        'Problemas no funcionamento',
        'Substituição de cabeamento',
        'Ajustes de sinal'
      ]
    },
    {
      title: 'Orçamento',
      icon: '📄',
      items: [],
      isFreeText: true,
      description: 'Campo livre disponível no formulário de solicitação para descrever detalhadamente a necessidade de novas aquisições, ampliações ou melhorias.'
    }
  ];

  const emergenciaisCategories = [
    {
      title: 'Câmeras de Monitoramento',
      icon: '🚨',
      items: [
        'Sistema todo inoperante',
        'DVR/NVR sem gravação',
        'Perda total de monitoramento'
      ]
    },
    {
      title: 'Portão da Garagem',
      icon: '🚗',
      items: [
        'Travado sem abrir/fechar',
        'Risco iminente de acidente',
        'Quebra ou queima de motor'
      ]
    },
    {
      title: 'Porta de Entrada',
      icon: '🚪',
      items: [
        'Travada sem abrir/fechar',
        'Risco iminente de acidente',
        'Quebra ou falha crítica de motor'
      ]
    },
    {
      title: 'Cerca Elétrica',
      icon: '⚡',
      items: [
        'Desligada totalmente',
        'Falha crítica de choque',
        'Curtos-circuitos que gerem risco físico'
      ]
    },
    {
      title: 'Iluminação de Segurança',
      icon: '💡',
      items: [
        'Desligada totalmente',
        'Falha crítica de choque',
        'Curtos-circuitos que gerem risco físico'
      ]
    }
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Classificação do Chamado</h1>
        <p>Explore a estrutura de categorização padrão de chamados operacionais e emergenciais no portal TecCosta.</p>
      </div>

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'operacionais' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('operacionais')}
        >
          🔧 Operacionais
        </button>
        <button
          className={`${styles.tabButton} ${styles.tabButtonEmergencial} ${activeTab === 'emergenciais' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('emergenciais')}
        >
          🚨 Emergenciais
        </button>
      </div>

      {activeTab === 'operacionais' ? (
        <div className={styles.categoryGrid}>
          {operacionaisCategories.map((cat, idx) => (
            <div key={idx} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <span className={styles.categoryTitle}>{cat.title}</span>
              </div>
              
              {cat.isFreeText ? (
                <p className={styles.orcamentoText}>{cat.description}</p>
              ) : (
                <div className={styles.subItemsList}>
                  {cat.items.map((sub, sIdx) => (
                    <div key={sIdx} className={styles.subItemCard}>
                      {sub}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.categoryGrid}>
          {emergenciaisCategories.map((cat, idx) => (
            <div key={idx} className={`${styles.categoryCard} ${styles.categoryCardEmergencial}`}>
              <div className={styles.categoryHeader}>
                <span className={`${styles.categoryIcon} ${styles.categoryIconEmergencial}`}>{cat.icon}</span>
                <span className={`${styles.categoryTitle} ${styles.categoryTitleEmergencial}`}>{cat.title}</span>
              </div>
              
              <div className={styles.subItemsList}>
                {cat.items.map((sub, sIdx) => (
                  <div key={sIdx} className={`${styles.subItemCard} ${styles.subItemCardEmergencial}`}>
                    {sub}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
