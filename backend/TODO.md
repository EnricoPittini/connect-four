# TODO

- Verificare che FIRST_ACCESS_MOPDERATOR non posso fare nessuna operazione se non login e confirm moderator
- Mettere websocket (login) (ricontrollare vari endpoint)
- Aggiungere return in ogni res.status().json()
- Cambiare il nome friend chat in private chat
- Creare funzione per rendere un giocatore offline (codice più modulare) (Tale codice è usato sia quando un giocatore va offline che quando viene eliminato)


## JWT token management
- Problema: il token rimane valido dopo aver eliminato l'account, quindi se un'altro utente si iscrive con quel username
  l'utente precedente può ancora accedere all'app con il suo token (in realtà anche se non viene creato un
  nuovo account con lo stesso username)
- Gestire invalidazione JWT token nelle varie routes (eventualmente con blacklist)
