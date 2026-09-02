const FLAG_CODES: Record<string, string> = {
  Argentina: "ar", Australia: "au", Austria: "at", Belgium: "be", Brazil: "br",
  Cameroon: "cm", Canada: "ca", Chile: "cl", Colombia: "co", Croatia: "hr",
  Denmark: "dk", Ecuador: "ec", Egypt: "eg", England: "gb-eng", France: "fr",
  Germany: "de", Ghana: "gh", Greece: "gr", Hungary: "hu", Iran: "ir",
  Ireland: "ie", Italy: "it", Japan: "jp", Mexico: "mx", Morocco: "ma",
  Netherlands: "nl", Nigeria: "ng", Norway: "no", Poland: "pl", Portugal: "pt",
  Senegal: "sn", Serbia: "rs", Slovakia: "sk", SouthAfrica: "za", SouthKorea: "kr",
  Spain: "es", Sweden: "se", Switzerland: "ch", Turkey: "tr", Ukraine: "ua",
  Uruguay: "uy", USA: "us", Scotland: "gb-sct", Wales: "gb-wls", Albania: "al",
  CzechRepublic: "cz", BosniaandHerzegovina: "ba", Romania: "ro", Paraguay: "py",
  Peru: "pe", Venezuela: "ve", Bolivia: "bo", SaudiArabia: "sa", Qatar: "qa",
  Iraq: "iq", UAE: "ae", Uzbekistan: "uz", Jordan: "jo", Thailand: "th", China: "cn",
  IvoryCoast: "ci", Tunisia: "tn", Mali: "ml", DRCongo: "cd", Guinea: "gn",
  CapeVerde: "cv", CostaRica: "cr", Panama: "pa", Jamaica: "jm", Honduras: "hn",
  Haiti: "ht", ElSalvador: "sv", Algeria: "dz", Finland: "fi", Iceland: "is", Slovenia: "si",
  Georgia: "ge", Syria: "sy", Oman: "om", Vietnam: "vn", Indonesia: "id", Malaysia: "my",
  India: "in", Lebanon: "lb", Curacao: "cw", TrinidadandTobago: "tt", Angola: "ao",
  BurkinaFaso: "bf", EquatorialGuinea: "gq", Zambia: "zm", Kenya: "ke", Gabon: "ga",
  Togo: "tg", Congo: "cg", Tanzania: "tz", Zimbabwe: "zw", Mozambique: "mz",
  Rwanda: "rw", Benin: "bj", Namibia: "na", Botswana: "bw", Madagascar: "mg",
  NewZealand: "nz", Philippines: "ph", Singapore: "sg", HongKong: "hk",
};

export function getFlagUrl(nationality?: string): string | undefined {
  if (!nationality) return undefined;
  const code = FLAG_CODES[nationality.replace(/\s+/g, "")];
  return code ? `https://flagcdn.com/w320/${code}.png` : undefined;
}
