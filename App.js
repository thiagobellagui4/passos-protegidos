import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar, ScrollView } from 'react-native';

// --- BANCO DE DADOS SIMULADO PARA TESTES ---
let memoriaBanco = [];
let listeners = [];

const notificarListeners = () => {
  listeners.forEach(callback => callback());
};

const addDoc = async (colName, dados) => {
  const novoId = 'doc_' + Date.now();
  const novoItem = { id: novoId, ...dados };
  memoriaBanco.push(novoItem);
  notificarListeners();
  return { id: novoId };
};

const doc = (colName, id) => ({ id });

const onSnapshot = (refOrQuery, callback) => {
  const executarLeitura = () => {
    if (typeof refOrQuery === 'string') {
      const pendentes = memoriaBanco.filter(item => item.status === 'pendente');
      callback({
        forEach: (fn) => pendentes.forEach(item => fn({ id: item.id, data: () => item }))
      });
    } else {
      const item = memoriaBanco.find(i => i.id === refOrQuery.id);
      callback({
        exists: () => !!item,
        data: () => item
      });
    }
  };

  listeners.push(executarLeitura);
  executarLeitura();

  return () => {
    listeners = listeners.filter(l => l !== executarLeitura);
  };
};

const updateDoc = async (ref, novosDados) => {
  memoriaBanco = memoriaBanco.map(item => {
    if (item.id === ref.id) {
      return { ...item, ...novosDados };
    }
    return item;
  });
  notificarListeners();
};

const query = (col, ...args) => col;
const where = (campo, op, valor) => ({ campo, op, valor });

export default function App() {
  const [modo, setModo] = useState('escolha');
  const [statusFilho, setStatusFilho] = useState('normal');
  const [solicitacaoId, setSolicitacaoId] = useState(null);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const childId = "dispositivo_filho_01";

  const solicitarAutorizacao = async (acao) => {
    try {
      setStatusFilho('pendente');
      const docRef = await addDoc('autorizacoes', {
        childId: childId,
        acao: acao,
        status: 'pendente',
        criadoEm: new Date()
      });
      setSolicitacaoId(docRef.id);

      const unsubscribe = onSnapshot(doc('autorizacoes', docRef.id), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const dados = docSnapshot.data();
          if (dados.status === 'aprovado') {
            setStatusFilho('aprovado');
            Alert.alert("Sucesso!", "Os pais aprovaram a solicitação.");
            unsubscribe();
          } else if (dados.status === 'recusado') {
            setStatusFilho('recusado');
            Alert.alert("Acesso Negado", "Os pais recusaram a solicitação.");
            unsubscribe();
          }
        }
      });
    } catch (error) {
      console.error("Erro ao solicitar:", error);
      setStatusFilho('normal');
      Alert.alert("Erro", "Não foi possível enviar a solicitação.");
    }
  };

  useEffect(() => {
    if (modo === 'pais') {
      const q = query('autorizacoes', where('status', '==', 'pendente'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const lista = [];
        querySnapshot.forEach((documento) => {
          lista.push({ id: documento.id, ...documento.data() });
        });
        setPedidosPendentes(lista);
      });
      return () => unsubscribe();
    }
  }, [modo]);

  const responderSolicitacao = async (id, novoStatus) => {
    try {
      const docRef = doc('autorizacoes', id);
      await updateDoc(docRef, { status: novoStatus });
    } catch (error) {
      console.error("Erro ao responder:", error);
    }
  };

  if (modo === 'escolha') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.contentCenter}>
          <Text style={styles.mainTitle}>Passos Protegidos</Text>
          <Text style={styles.subtitle}>Escolha o modo de visualização para testar o sistema de autorização:</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#06b6d4' }]} onPress={() => setModo('filho')}>
            <Text style={styles.btnTextDark}>📱 Entrar no Modo Filho</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46' }]} onPress={() => setModo('pais')}>
            <Text style={styles.btnTextLight}>👨‍👩‍👧 Entrar no Painel dos Pais</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (modo === 'filho') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setModo('escolha')}><Text style={styles.backText}>⬅️ Voltar</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Modo Filho</Text>
        </View>
        <View style={styles.contentCenter}>
          {statusFilho === 'normal' && (
            <TouchableOpacity style={styles.btnDanger} onPress={() => solicitarAutorizacao('Desinstalar App / Mudar Configurações')}>
              <Text style={styles.btnTextWhite}>⚠️ Tentar Desinstalar / Configurações</Text>
            </TouchableOpacity>
          )}
          {statusFilho === 'pendente' && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#06b6d4" />
              <Text style={styles.infoText}>Aguardando autorização dos pais...</Text>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setStatusFilho('normal')}>
                <Text style={styles.btnTextWhite}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
          {statusFilho === 'aprovado' && (
            <View style={styles.centerBox}>
              <Text style={[styles.infoText, { color: '#34d399', fontWeight: 'bold' }]}>✅ Ação Liberada pelos Pais!</Text>
              <TouchableOpacity style={styles.btn} onPress={() => setStatusFilho('normal')}>
                <Text style={styles.btnTextDark}>Reiniciar</Text>
              </TouchableOpacity>
            </View>
          )}
          {statusFilho === 'recusado' && (
            <View style={styles.centerBox}>
              <Text style={[styles.infoText, { color: '#f43f5e', fontWeight: 'bold' }]}>❌ Acesso Negado pelos Pais.</Text>
              <TouchableOpacity style={styles.btn} onPress={() => setStatusFilho('normal')}>
                <Text style={styles.btnTextDark}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setModo('escolha')}><Text style={styles.backText}>⬅️ Voltar</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Painel dos Pais (Aprovações)</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {pedidosPendentes.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma solicitação pendente no momento.{'\n\n'}(Vá no modo filho e clique em "Tentar Desinstalar" para testar).</Text>
        ) : (
          pedidosPendentes.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardSub}>Dispositivo: {item.childId}</Text>
              <Text style={styles.cardTitle}>Solicitação: {item.acao}</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => responderSolicitacao(item.id, 'aprovado')}>
                  <Text style={styles.btnTextWhite}>Aprovar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f43f5e' }]} onPress={() => responderSolicitacao(item.id, 'recusado')}>
                  <Text style={styles.btnTextWhite}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  contentCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mainTitle: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#09090b', borderBottomWidth: 1, borderBottomColor: '#27272a' },
  backText: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
  headerTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginLeft: 16 },
  btn: { width: '100%', maxWidth: 350, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnDanger: { width: '100%', maxWidth: 350, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#7f1d1d', borderWidth: 1, borderColor: '#f43f5e' },
  btnCancel: { width: '100%', maxWidth: 200, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#3f3f46', marginTop: 20 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnTextDark: { color: '#000000', fontWeight: '900', fontSize: 14 },
  btnTextLight: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  btnTextWhite: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  centerBox: { alignItems: 'center', width: '100%' },
  infoText: { color: '#e4e4e7', fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 20 },
  emptyText: { color: '#71717a', textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 },
  card: { backgroundColor: '#09090b', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  cardSub: { color: '#71717a', fontSize: 11, marginBottom: 4 },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' }
});
