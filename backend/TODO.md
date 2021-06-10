# TODO

- Verificare che FIRST_ACCESS_MOPDERATOR non posso fare nessuna operazione se non login e confirm moderator


## JWT token management
- Problema: il token rimane valido dopo aver eliminato l'account, quindi se un'altro utente si iscrive con quel username
  l'utente precedente può ancora accedere all'app con il suo token (in realtà anche se non viene creato un
  nuovo account con lo stesso username)
- Gestire invalidazione JWT token nelle varie routes (eventualmente con blacklist)
