# Layout-Editor
An Obsidian Plugin developed to help you quickly and comfortably design complex layouts for other obsidian plugins.

Geplante Features:
  Eine Layout Editor Ansicht die:
  - Über eine intuitive echtzeit Arbeitsfläche verfügt, in der man Layouts interaktiv designen kann
  - Mit Godot-ähnlicher Node Übersicht zur Linken
  - Mit godot-ähnlicher Element Bearbeiten funktionen zur rechten
  - Erstellte Layouts werden in einen "LE-Layouts" Ordner im Obsidian Vault gespeichert, von wo aus sie erneut geöffnet werden können um weiter an ihnen zu arbeiten odre von anderen Plugis genutzt werden können.
  - Ui Komponenten können über eine godot-ähnliche node-auswahl zur Arbeitsfläche hinzugefügt werden.
  - UI Elemente werden aus einem LE-Elements Ordner im Vault gezogen, in welchem user ganz einfach eigene Elemente hinzufügen können. Alle Elemente sind deshalb komplett selfcontained, es sei denn sie inheriten Funktionen von anderen Elementen.
    
  UI Elemente enthalten:
  - Textfelder zum anzeigen oder editieren von Text
  - Buttons, checkboxen und andere Elemente, welche mit Funktionen anderer Plugins verbunden werden können, solange diese in einem LE-Functions Ordner im Vault gespeichert sind
  - View-container, welche mit renderausgaben verbunden werden können, solange diese aus einem LE-Views ordner im Vault importiert werden können.
  - Listen, Dropdown Menüs und andere Elemente, welche mit Daten aus anderen Plugins gefüttert werden können, solange diese aus einem LE-Data Ordner im Vault importiert weden können.

  Eingebaute Layouts enthalten:
  - Das Layout des Layout Editors selbst, damit User es selber nach ihrem Bedarf anpassen können.

  Eingebaute LE-Functions enthalten:
  - ein Exporter, welcher Daten aus UI Elementen in einem importfreundlichen Format in LE-Data speichert
  - Alle Funktionen des Editors, damit User den Editor selber nach eigeneme Bedarf anpassen können.
