# TODO (frontend)

- Rimpiazzare 'Stats' con 'Profile' nella home
- Aggiungere evento socketIO 'deletedChat' che permette al Server di notificare un Client quando una chat viene eliminata (o player eliminato o friend eliminato).
- Cambiare 'friend chat' in 'private chat' (o solo chat) (sia lato Client che lato Server)
- Aggiungere evento socketIO 'friendIngame' che notifica i Client di un loro amico in game
- cambiare nomi dei metodi della friend service (da sendFriendREquest a NotifyAvailability. E lo stesso per deleteFriendRequest)


## AuthService
- Add `isAutheticated` method

- Add Auth Guard
https://medium.com/@ryanchenkie_40935/angular-authentication-using-route-guards-bf7a4ca13ae3
https://github.com/bartosz-io/jwt-auth-angular/blob/master/src/app/auth/services/auth.service.ts

- Add Role Guard: allow only the roles passed

- Emettere evento onlne ???

## Nav bar
- Sarebbe bello inserire un puntino rosso se ci sono nuove notifiche (messaggi / richieste
  di amicizia). Puntino rosso vicino al link chat / friend request.


## Fake data
- https://randomuser.me/


## Env
- environment.ts


## Socket.io
- Verificare di aver gestito tutti gli eventi in client-events e server-events
- Eventi ingame per i friends
- Controllare eventi cancel friend match request
- Eventi online e ingame potrebbero essere mandati a tutti i player (così c'è aggiornamento dinamico di online e ingame in stats)


## Game page
- Il boardi dei riquadri dei giocatori sono sbagliati: ora il rosso è sempre a sinistra,
  ma potrebbe essere anche a destra.

## StatsComponent
- Rilevazione dinamica di amico/non amico
- Rilevazione dinamica di online/nononline (solo se amico)
- Errore se si clicca le proprie stats dalle stats di un altro giocatore

## Funzionalità Moderator
- Aggiungere creazione nuovo moderator
- Aggiungere conferma moderator
