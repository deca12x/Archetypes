                                                                                                                                  
                                      %@@@       @@@@@@                                           
                                    @@@@@@=      @@@@@+      #@%                                  
                                     @@@@@@      @@@@@       @@@@@@                               
                         :@@@@       %@@@@@      @@@@@      @@@@@@                                
                         @@@@@@:      @@@@@      @@@@@      @@@@@        :                        
                          @@@@@@+     .@@@@@     @@@@      @@@@@       :@@@@                      
                           @@@@@@-     #@@@@     @@@@      @@@@       @@@@@@@@                    
                 @@@=        @@@@@      @@@=     @@@@     @@@@*      @@@@@@@                      
                @@@@@@=       @@@@@   %@@=       @@@@@@    @@@      @@@@@@                        
                @@@@@@@@.      :@@ @@@@@@@       @@@@@@           %@@@@@          *               
                  *@@@@@@@          @@@@@@*      @@@@@        @@@@@@@@#        -@@@@              
                     @@@@@@@         @@@@@@      @@@@@       @@@@@@@@        @@@@@@@@             
           :            @@@@@#        @@@@@+     @@@@:      @@@@@@@       %@@@@@@@@@              
          @@@@@#          @@@@@=       @@@@@     @@@@      @@@@@@       @@@@@@@@@                 
         @@@@@@@@@@*     @@@@@@@@=      @@@@     @@@#     @@@@@         @@@@@                     
          *@@@@@@@@@@@%   :@@@@@@@@      #@             %@@@@           @@                        
               @@@@@@@@      %@@@@@@@                    @@+         @@@@@         @@@@@@         
                     :           @@@@@                           #@@@@@@@@@: %@@@@@@@@@@@.        
                                   :*                         #@@@@@@@@@@@@@@@@@@@@@@@@@@@        
       @@@@@@*       @@@@@@                                  @@@@@@@@=      @@@@@@.               
       @@@@@@@@@@@@@@@@@@@@@@@@@@*          Archetypes                                                      
       @@@@@@@@@@@@@@@@@@@@@@@@@@@@           of the                                                    
                                            Collective                      .@@@@@@@@@@@@@        
                                           Unconsciouss        @@@@@@@@@@@@@@@@@@@@@@@@@@@@        
                                                              +@@@@@@@@@@@@@@@@@@@@@@@@@@@        
            .@@@@@@@@       #@@@@@@@                                  @@@@@@         .@@@@        
       #@@@@@@@@@@@@@@#@@@@@@@@@@@@                                                               
        @@@@@@@@@@@:  @@@@@@@@@@                           @@@@@           @%                     
        @@@@@          @@@@@@        =@@                    @@@@@@@+      @@@@@@@@@               
                       @@:          @@@@@             @@      @@@@@@@@     @@@@@@@@@@@@*          
                   +@@@@@         @@@@@%     @@@     @@@@      -@@@@@@@@+     @@@@@@@@@@          
               :@@@@@@@@@       @@@@@@+     @@@@     @@@@@       =@@@@@@          %@@@@           
            =@@@@@@@@@:       @@@@@@@*      @@@@      @@@@@        *@@@@@@                        
            @@@@@@@@        @@@@@@@@%      @@@@@      @@@@@@         @@@@@@@#                     
             +@@@         #@@@@@@@@.       @@@@@       @@@@@@          @@@@@@@@.                  
                         @@@@@%   .       @@@@@@       @@@@@@@#@@@       @@@@@@@@.                
                       @@@@@@      @@@@   @@@@@@        @@@   @@@@@        @@@@@@                 
                     @@@@@@@      -@@@@     @@@@     @@@@      @@@@@#        @@%                  
                   -@@@@@@@       @@@@+     @@@@     @@@@@      @@@@@@                            
                     #@@@        @@@@@      @@@@      @@@@*      @@@@@@.                          
                                @@@@@      %@@@@      @@@@@       @@@@@@=                         
                               @@@@@@      @@@@@      @@@@@@       @@@@                           
                              @@@@@@       @@@@@      +@@@@@%                                     
                                 .*@       @@@@@       @@@@@@                                     
                                          @@@@@@       %@*                                        

# BACKEND

https://github.com/deca12x/ArchetypesOnchain

# Archetypes of the Collective Unconscious

A real-time multiplayer strategy RPG where players embody timeless archetypes, competing to unlock a shared crypto treasure chest.

Built on **Mantle Network**, this game blends the thrill of tactical RPGs with the power of blockchain rewards.
Unlike traditional RPGs, there are no turns. Every player acts independently with move cooldowns, forging alliances, making plays, and racing to reach the treasure — or sabotage it.  
Victory isn’t guaranteed. Players must navigate complex social dynamics, strategic paths, and resource management to claim their share.

---                                                                                          


## Archetypes Overview

Players embody 12 unique Archetypes, each with special abilities that define their playstyle and strategy path:

| Archetype | Role | Unique Ability |
|-----------|------|----------------|
| Hero | Opener | Inspire Alliance — Bind with another player for shared victory. |
| Explorer | Opener | Lockpick — Remove padlocks without needing a key. |
| Innocent | Opener | Purify — Removes magical seals from the chest. |
| Artist | Opener | Master Key — Craft special keys that bypass defenses. |
| Ruler | Blocker | Royal Decree — Temporarily halt key forging. |
| Caregiver | Blocker | Guardian Bond — Share victory through protection and support. |
| Common Man | Blocker | Copycat — Mimics the last move used. |
| Joker | Blocker | Fake Key — Plants deceptive keys to trap opponents. |
| Wizard | Double Agent | Conjure Staff — Removes magical seals, shifts alliances. |
| Outlaw | Double Agent | Backstab — Breaks alliances to form new ones. |
| Lover | Double Agent | Soul Bond — Forms unbreakable victory pact. |
| Sage | Double Agent | Dispel Magic — Neutralizes fake keys and seals. |

Each archetype influences whether a player tries to unlock the chest (Opener), block progress (Blocker), or play both sides (Double Agent).

---


## Game Goals and Mechanics

One must lose oneself in the depths of the collective subconscious to return to the surface having defeated the Jungian shadow.

---


## Tech Stack

- Next.js 15 with App Router
- Thirdweb SDK and Authentication
- Mantle Network smart contract integration *
- TypeScript
- Tailwind CSS
- Thirdweb Nebula AI Chat API, with separate Python server
- GridEngine / Phaser 3 (Game logic integration)

---


## Nebula Subconscious Chat Integration

Players will converse with their Archetype's subconscious — an AI-driven companion that offers hints, lore, and reactive dialogue.

Powered by the Thirdweb Nebula API, this feature keeps players immersed, providing context-aware responses during gameplay.

### Features
- In-Game Thought Bubbles with hints and story elements.
- Persistent Subconscious Chat Interface for guidance and immersion.
- Dynamic AI responses reacting to player moves and game states.

---


## Run Locally

### Terminal 1 (Nextjs client)
(in root repo)
npm run dev
### Terminal 2 (Python Nebula Server)
cd nebula-backend
uvicorn uvicorn server:app --reload

---


## Learn More

* [Thirdweb Nebula](https://github.com/thirdweb-dev/ai/tree/main/python/examples/adapter_langchain)
* [Phaser 3 Documentation](https://docs.phaser.io/phaser/getting-started/what-is-phaser)
* [Socket.io v4 Documentation](https://socket.io/docs/v4/)



