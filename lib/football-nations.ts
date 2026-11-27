export const NATIONALITY_CHOICES = [{"value": "Vietnam"}, {"value": "England"}, {"value": "France"}, {"value": "Spain"}, {"value": "Germany"}, {"value": "Italy"}, {"value": "Brazil"}, {"value": "Argentina"}, {"value": "Portugal"}, {"value": "Netherlands"}, {"value": "Norway"}, {"value": "Turkey"}, {"value": "Morocco"}, {"value": "Tunisia"}, {"value": "Senegal"}, {"value": "Mexico"}, {"value": "Ivory Coast"}, {"value": "Algeria"}, {"value": "Panama"}, {"value": "Ghana"}, {"value": "Canada"}, {"value": "Croatia"}, {"value": "Iran"}, {"value": "Ecuador"}, {"value": "Bosnia and Herzegovina"}, {"value": "Qatar"}, {"value": "Paraguay"}, {"value": "Haiti"}, {"value": "Czech Republic"}, {"value": "Saudi Arabia"}, {"value": "Switzerland"}, {"value": "USA"}, {"value": "South Africa"}, {"value": "Cape Verde"}];

export function getNationalContinentalCup(nationality: string): string {
  const uefa = [
    "England", "France", "Spain", "Germany", "Italy", "Portugal", "Netherlands", "Croatia", "Belgium", 
    "Sweden", "Poland", "Denmark", "Austria", "Switzerland", "Norway", "Turkey", "Ukraine", "Scotland", 
    "Ireland", "Wales", "Greece", "Czech Republic", "Slovakia", "Hungary", "Romania", "Finland", 
    "Iceland", "Serbia", "Bosnia and Herzegovina", "Slovenia", "Georgia", "Albania"
  ];
  const conmebol = ["Brazil", "Argentina", "Uruguay", "Colombia", "Chile", "Ecuador", "Paraguay", "Peru", "Venezuela", "Bolivia"];
  const afc = [
    "Japan", "South Korea", "Saudi Arabia", "Australia", "Iran", "Iraq", "Qatar", "UAE", "Uzbekistan", 
    "Jordan", "Syria", "Oman", "China", "Vietnam", "Thailand", "Indonesia", "Malaysia", "India", "Lebanon"
  ];
  const concacaf = ["USA", "Mexico", "Canada", "Costa Rica", "Panama", "Jamaica", "Honduras", "Haiti", "El Salvador", "Curaçao", "Trinidad and Tobago"];
  const caf = [
    "Morocco", "Senegal", "Ivory Coast", "Egypt", "Nigeria", "Cameroon", "Algeria", "Tunisia", "Ghana", 
    "Mali", "South Africa", "DR Congo", "Angola", "Burkina Faso", "Guinea", "Cape Verde", "Equatorial Guinea", 
    "Zambia", "Kenya", "Gabon", "Togo"
  ];

  if (uefa.includes(nationality)) return "UEFA Euro";
  if (conmebol.includes(nationality)) return "Copa América";
  if (afc.includes(nationality)) return "AFC Asian Cup";
  if (concacaf.includes(nationality)) return "CONCACAF Gold Cup";
  if (caf.includes(nationality)) return "CAF Africa Cup of Nations";
  return "Continental Cup";
}
