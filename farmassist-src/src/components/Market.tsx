import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookmarkPlus, Download, Globe, Scale, Search, Store, Trash2, X } from "lucide-react";
import { fetchMandiPrices } from "../services/publicApis";
import { canonicalMarketFilters, comparablePrice, defaultMarketFilters, harvestValue, MARKET_DRAFT_KEY, MARKET_SEARCH_KEY, marketCsv, marketDay, marketPrice, marketRowId, marketSaleDraft, priceAge, quantityKg, validMarketSearch, viewMarketRows, type MarketFilters, type MarketSearch } from "../lib/market";
import { displayDate, downloadText, readStored, uid, useStored } from "../lib/storage";
import { localDay } from "../lib/planning";
import { useInterface } from "../lib/interface";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Busy, Empty, Field, Notice, Select, Title } from "./workspace";

const suggestions = [["Wheat", "गेहूं"], ["Paddy(Dhan)(Common)", "धान"], ["Mustard", "सरसों"], ["Onion", "प्याज"], ["Tomato", "टमाटर"]];
export function Market() {
  const { language } = useInterface(); const hi = language === "hi";
  const l = (en: string, hindi: string) => hi ? hindi : en;
  const navigate = useNavigate();
  const [draft, setDraft] = useState<MarketFilters>({ ...defaultMarketFilters });
  const [filters, setFilters] = useState(draft);
  const [saved, saveSearches] = useStored<MarketSearch[]>(MARKET_SEARCH_KEY, []);
  const searches = saved.filter(validMarketSearch).slice(0, 8);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [recent, setRecent] = useState(false);
  const [unit, setUnit] = useState<"kg" | "quintal">("quintal");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<"kg" | "quintal">("kg");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const query = useQuery({ queryKey: ["market-v3", filters], queryFn: () => fetchMandiPrices(filters), staleTime: 300000, refetchOnWindowFocus: false, networkMode: "always" });
  useEffect(() => { setSelected([]); }, [query.data]);
  const records = query.data?.records || [];
  const rows = viewMarketRows(records, search, recent, sort);
  const selection = records.filter(row => selected.includes(marketRowId(row)));
  let kg = ""; try { if (quantity.trim()) kg = quantityKg(quantity, quantityUnit); } catch { /* Keep invalid input visible, never substitute zero. */ }
  const money = (value: number) => new Intl.NumberFormat(hi ? "hi-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
  const price = (value: unknown) => { const n = marketPrice(value); return n === null ? "--" : new Intl.NumberFormat(hi ? "hi-IN" : "en-IN", { maximumFractionDigits: 2 }).format(n / (unit === "kg" ? 100 : 1)); };
  const newest = records.map(row => marketDay(row.arrival_date)).filter((day): day is string => Boolean(day && day <= localDay())).sort().at(-1);
  function apply(next: MarketFilters) {
    next = canonicalMarketFilters(next);
    setDraft({ ...next }); setFilters({ ...next }); setSearch(""); setSelected([]); setError(""); setMessage("");
    if (JSON.stringify(next) === JSON.stringify(filters)) void query.refetch();
  }
  function remember() {
    setError(""); setMessage("");
    const current = readStored<MarketSearch[]>(MARKET_SEARCH_KEY, []).filter(validMarketSearch);
    if (!name.trim()) { setError(l("Give this saved search a name.", "इस खोज का नाम लिखें।")); return; }
    if (current.some(row => row.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) { setError(l("That name is already saved. Choose another name.", "यह नाम पहले से सहेजा है। दूसरा नाम चुनें।")); return; }
    if (current.length >= 8) { setError(l("Remove a saved search before adding another. The limit is eight.", "नई खोज से पहले एक सहेजी खोज हटाएं। अधिकतम आठ खोजें रख सकते हैं।")); return; }
    if (saveSearches([...current, { id: uid(), name: name.trim(), filters: { ...filters } }])) { setName(""); setMessage(l("Search saved on this device.", "खोज इस डिवाइस पर सहेजी गई।")); }
  }
  function compare() {
    setError("");
    try {
      if (quantity.trim() && !kg) throw new Error("quantity");
      const payload = marketSaleDraft(selection, kg);
      sessionStorage.setItem(MARKET_DRAFT_KEY, JSON.stringify(payload));
      navigate("/sales");
    } catch (e) {
      const code = (e as Error).message;
      setError(code === "matching_crop" ? l("Select the same commodity and variety for a meaningful comparison.", "तुलना के लिए एक ही फसल और किस्म के भाव चुनें।") : code === "quantity" ? l("Enter a positive harvest quantity within 10,000,000 kg, with up to two decimal places.", "उपज की मात्रा शून्य से अधिक और 1,00,00,000 किलो तक रखें, अधिकतम दो दशमलव अंक।") : code === "price_date" ? l("A selected record has a missing, future or inconsistent price/date. Choose another record.", "चुने रिकॉर्ड का भाव या तारीख गायब, भविष्य की या असंगत है। दूसरा रिकॉर्ड चुनें।") : l("The comparison could not open. Keep 2–5 records selected and allow device storage, or enter quotes in Sale Planner.", "तुलना नहीं खुली। 2–5 रिकॉर्ड चुनें और डिवाइस स्टोरेज की अनुमति दें, या बिक्री योजना में भाव भरें।"));
    }
  }
  return <>
    <Title title={l("Mandi market prices", "मंडी के भाव")} description={l("Dated prices. Clear costs. A better-informed sale.", "तारीख वाले भाव। स्पष्ट खर्च। सोच-समझकर बिक्री।")} action={<NavLink className="text-link" to="/sales"><Scale size={18} />{l("Sale planner", "बिक्री की योजना")}<ArrowUpRight size={16}/></NavLink>} />
    <div className="market-workflow"><Store size={22}/><p>{l("Published prices are references, not buyer offers. Compare the same crop, variety and grade; confirm the mandi price before travelling.", "प्रकाशित भाव संदर्भ हैं, खरीदार के ऑफर नहीं। समान फसल, किस्म और गुणवत्ता की तुलना करें; जाने से पहले मंडी का भाव पक्का करें।")}</p></div>
    <form className="market-search" onSubmit={e => { e.preventDefault(); apply(draft); }}>
      <div className="fields fields-2 market-primary-filters">
        {([["commodity", "Commodity", "फसल"], ["state", "State", "राज्य"]] as const).map(([key, en, hindi]) => <Field key={key} label={l(en, hindi)}><Input maxLength={100} list={key === "commodity" ? "market-commodities" : undefined} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></Field>)}
      </div>
      <details className="market-more-filters"><summary>{l("District, mandi & date", "जिला, मंडी और तारीख")}{[filters.district,filters.market,filters.date].filter(Boolean).length ? ` · ${[filters.district,filters.market,filters.date].filter(Boolean).length}` : ""}</summary><div className="fields fields-3">
        {([["district", "District", "जिला"], ["market", "Market", "मंडी"]] as const).map(([key,en,hindi])=><Field key={key} label={l(en,hindi)}><Input maxLength={100} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></Field>)}
        <Field label={l("Arrival date (optional)", "आवक की तारीख (वैकल्पिक)")}><Input type="date" max={localDay()} value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></Field>
      </div></details>
      <datalist id="market-commodities">{suggestions.map(([en, hindi]) => <option key={en} value={en}>{hi ? hindi : en}</option>)}</datalist>
      <div className="actions"><Button disabled={query.isFetching}><Search size={18}/>{l("Search prices", "भाव खोजें")}</Button><Button type="button" variant="secondary" disabled={query.isFetching} onClick={() => apply({ commodity: "", state: "", district: "", market: "", date: "" })}><Globe size={18}/>{l("Show all markets", "सभी मंडियां देखें")}</Button></div>
    </form>
    <details className="market-saved"><summary>{l("Saved searches", "सहेजी हुई खोजें")} · {searches.length}/8</summary>
      <div className="market-save-form"><Field label={l("Saved search name", "सहेजी खोज का नाम")}><Input maxLength={50} value={name} onChange={e => setName(e.target.value)} /></Field><Button variant="secondary" onClick={remember}><BookmarkPlus size={18}/>{l("Save current search", "मौजूदा खोज सहेजें")}</Button></div>
      <small>{l("Saves the applied filters on this device, not a background price alert. Search preferences are not included in record backups.", "लागू खोज इस डिवाइस पर सहेजी जाएगी; अपने आप भाव का अलर्ट नहीं आएगा। खोज की पसंद रिकॉर्ड बैकअप में शामिल नहीं होती।")}</small>
      <ul className="market-presets">{searches.map(row => <li key={row.id}><button type="button" className="text-link" onClick={() => apply(row.filters)}>{row.name}<ArrowUpRight size={15}/></button><Button variant="ghost" aria-label={`${l("Remove search", "खोज हटाएं")}: ${row.name}`} title={l("Remove saved search", "सहेजी खोज हटाएं")} onClick={() => saveSearches(readStored<MarketSearch[]>(MARKET_SEARCH_KEY, []).filter(validMarketSearch).filter(item => item.id !== row.id))}><Trash2 size={16}/></Button></li>)}</ul>
    </details>
    {message && <Notice>{message}</Notice>}{error && <Notice error>{error}</Notice>}
    {query.isFetching && <Busy label={l("Checking mandi records", "मंडी के रिकॉर्ड देखे जा रहे हैं")} />}
    {query.data && <div className={`market-feed market-feed-${query.data.status}`} role="status"><strong>{query.data.source}: {query.data.status}.</strong><span>{hi ? (query.data.status === "live" ? "फीड जुड़ी है; आवक की तारीख अलग से जांचें।" : query.data.status === "cached" ? "पुराने सहेजे भाव; आज के भाव नहीं।" : "मंडी की सेवा उपलब्ध नहीं है। फिर प्रयास करें या आधिकारिक पोर्टल देखें।") : query.data.message || `Retrieved ${displayDate(query.data.retrievedAt)}.`}</span>{query.data.retrievedAt && <small>{l("Retrieved", "प्राप्त किया")}: {displayDate(query.data.retrievedAt)}</small>}{query.data.sourceUpdatedAt && <small>{l("Feed updated", "फीड अपडेट")}: {displayDate(query.data.sourceUpdatedAt)}</small>}{hi && query.data.message && <details><summary>Service details</summary>{query.data.message}</details>}</div>}
    {!!query.data?.excluded && <Notice>{l("Duplicate or unusable records excluded", "दोहराए या अनुपयोगी रिकॉर्ड हटाए गए")}: {query.data.excluded}</Notice>}
    {!!records.length && <>
      <div className="market-summary"><div><strong>{records.length}</strong><span>{l("Published records loaded", "प्राप्त प्रकाशित रिकॉर्ड")}</span></div><div><strong>{new Set(records.map(row => `${row.state}/${row.district}/${row.market}`)).size}</strong><span>{l("Mandis in these results", "इन नतीजों में मंडियां")}</span></div><div><strong>{newest ? new Date(`${newest}T12:00:00`).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }) : "--"}</strong><span>{l("Newest arrival date", "सबसे नई आवक तारीख")}</span></div></div>
      <div className="market-harvest fields fields-2"><Field label={l("Your harvest quantity (optional)", "आपकी उपज की मात्रा (वैकल्पिक)")}><Input type="number" min="0.01" step="0.01" max={quantityUnit === "kg" ? 10000000 : 100000} value={quantity} onChange={e => setQuantity(e.target.value)} /></Field><Field label={l("Harvest unit", "उपज की इकाई")}><Select value={quantityUnit} onChange={e => setQuantityUnit(e.target.value as "kg" | "quintal")}><option value="kg">{l("Kilograms", "किलोग्राम")}</option><option value="quintal">{l("Quintals (100 kg)", "क्विंटल (100 किलो)")}</option></Select></Field></div>
      {quantity.trim() && !kg && <Notice error>{l("Enter a positive valid harvest quantity. No zero estimate has been substituted.", "उपज की सही, शून्य से अधिक मात्रा लिखें। गलत जानकारी को शून्य नहीं माना गया है।")}</Notice>}
      <div className="market-view-controls"><Field label={l("Search loaded records", "प्राप्त रिकॉर्ड में खोजें")}><Input type="search" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /></Field><Field label={l("Sort prices", "भाव का क्रम")}><Select value={sort} onChange={e => setSort(e.target.value)}><option value="latest">{l("Newest arrival first", "नई आवक पहले")}</option><option value="high">{l("Modal price: high to low", "प्रचलित भाव: अधिक से कम")}</option><option value="low">{l("Modal price: low to high", "प्रचलित भाव: कम से अधिक")}</option><option value="market">{l("Mandi name", "मंडी का नाम")}</option></Select></Field><fieldset className="market-unit"><legend>{l("Display unit", "भाव की इकाई")}</legend>{(["quintal", "kg"] as const).map(value => <label key={value}><input type="radio" name="market-unit" value={value} checked={unit === value} onChange={() => setUnit(value)} />{value === "kg" ? l("Rs / kg", "रु / किलो") : l("Rs / quintal", "रु / क्विंटल")}</label>)}</fieldset></div>
      <div className="section-row market-view-actions"><label className="market-recent"><input type="checkbox" checked={recent} onChange={e => setRecent(e.target.checked)} />{l("Arrivals in the last 7 days", "पिछले 7 दिनों की आवक")}</label><Button variant="secondary" disabled={!rows.length} onClick={() => { if (query.data) downloadText(`JOITAFA-mandi-${localDay()}.csv`, marketCsv(rows, query.data), "text/csv;charset=utf-8"); }}><Download size={17}/>{l("Export this view", "ये नतीजे निर्यात करें")}</Button></div>
      <p className="muted">{rows.length}/{records.length} {l("loaded records shown. Gross references use the published modal price before any costs. They are not expected income or confirmed offers.", "प्राप्त रिकॉर्ड दिख रहे हैं। सकल संदर्भ में बिना खर्च घटाए प्रकाशित प्रचलित भाव लिया गया है। यह तय आय या पक्का ऑफर नहीं है।")}</p>
    </>}
    {!!selection.length && <div className="market-comparison-bar"><span><strong>{selection.length}/5</strong> {l("references selected", "संदर्भ चुने गए")}</span><Button disabled={selection.length < 2 || query.isFetching} onClick={compare}><Scale size={18}/>{l("Compare after costs", "खर्च घटाकर तुलना करें")}</Button><Button variant="ghost" title={l("Clear selection", "चयन हटाएं")} onClick={() => setSelected([])}><X size={17}/>{l("Clear", "हटाएं")}</Button></div>}
    {!!rows.length && <div className="table-wrap market-table"><table><caption>{l("Published mandi records", "प्रकाशित मंडी रिकॉर्ड")} / {query.data?.status} / {unit === "kg" ? "INR/kg" : "INR/quintal"}</caption><thead><tr>{[l("Compare", "तुलना"), l("Commodity / variety", "फसल / किस्म"), l("Market", "मंडी"), l("District / state", "जिला / राज्य"), l("Arrival date", "आवक की तारीख"), l("Min / modal / max", "न्यूनतम / प्रचलित / अधिकतम"), l("Gross reference", "सकल संदर्भ")].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => {
      const id = marketRowId(row), age = priceAge(row), gross = harvestValue(row, kg), usable = comparablePrice(row) !== null;
      return <tr key={id} className={selected.includes(id) ? "market-selected-row" : undefined}><td><input type="checkbox" aria-label={`${l("Select", "चुनें")} ${row.commodity} / ${row.variety || "--"} / ${row.market} / ${row.arrival_date}`} checked={selected.includes(id)} disabled={!usable || (!selected.includes(id) && selected.length >= 5) || query.isFetching} onChange={e => { setError(""); setSelected(e.target.checked ? [...selected, id] : selected.filter(key => key !== id)); }} /></td><th scope="row">{row.commodity}<small>{row.variety || l("Variety not supplied", "किस्म उपलब्ध नहीं")}</small></th><td>{row.market}</td><td>{row.district}<small>{row.state}</small></td><td>{row.arrival_date}<small className={age === null || age < 0 || age > 7 ? "market-date-warning" : undefined}>{age === null || age < 0 ? l("Check date", "तारीख जांचें") : age === 0 ? l("Today", "आज") : `${age} ${l("days ago", "दिन पहले")}`}</small></td><td className="market-price">{price(row.min_price)} / <strong>{price(row.modal_price)}</strong> / {price(row.max_price)}{!usable && <small className="market-date-warning">{l("Price/date needs confirmation", "भाव/तारीख की पुष्टि करें")}</small>}</td><td>{gross === null ? "--" : <strong>{money(gross)}</strong>}</td></tr>;
    })}</tbody></table></div>}
    {!!rows.length && <ul className="market-mobile" aria-label={l("Mandi price cards", "मंडी के भाव की सूची")}>{rows.map(row => {
      const id=marketRowId(row), usable=comparablePrice(row)!==null, age=priceAge(row), gross=harvestValue(row,kg);
      return <li key={id} className={selected.includes(id)?"market-selected-row":undefined}>
        <div className="market-mobile-heading"><div><strong>{row.market}</strong><span>{row.commodity} / {row.variety || "--"}</span></div><div className="market-mobile-price"><strong>{price(row.modal_price)}</strong><span>{unit==="kg"?l("Rs / kg","रु / किलो"):l("Rs / quintal","रु / क्विंटल")}</span></div></div>
        <p>{row.district}, {row.state}</p><p className={age===null||age<0||age>7?"market-date-warning":undefined}>{row.arrival_date} · {age===null||age<0?l("Check date","तारीख जांचें"):age===0?l("Today","आज"):`${age} ${l("days ago","दिन पहले")}`}</p>
        <small>{l("Min / max", "न्यूनतम / अधिकतम")}: {price(row.min_price)} / {price(row.max_price)}</small>
        {gross!==null&&<p>{l("Gross reference", "सकल संदर्भ")}: <strong>{money(gross)}</strong></p>}
        {!usable&&<p className="market-date-warning">{l("Price/date needs confirmation", "भाव/तारीख की पुष्टि करें")}</p>}
        <label className="market-mobile-select"><input type="checkbox" aria-label={`${l("Select", "चुनें")} ${row.commodity} / ${row.variety||"--"} / ${row.market} / ${row.arrival_date}`} checked={selected.includes(id)} disabled={!usable||(!selected.includes(id)&&selected.length>=5)||query.isFetching} onChange={e=>{setError("");setSelected(e.target.checked?[...selected,id]:selected.filter(key=>key!==id));}}/>{l("Compare this reference", "इस संदर्भ की तुलना करें")}</label>
      </li>;
    })}</ul>}
    {!query.isFetching && !rows.length && <Empty>{records.length ? l("No records match this view. Clear the loaded-record search or seven-day filter.", "इन विकल्पों में कोई रिकॉर्ड नहीं है। रिकॉर्ड की खोज या सात दिन का विकल्प हटाएं।") : query.data?.status === "live" ? l(`No published prices match ${filters.state.trim() || "these filters"}. The daily feed may not yet include your market; this is not a zero price.`, "इन विकल्पों के लिए प्रकाशित भाव नहीं मिले। फीड में आपकी मंडी की आवक अभी न हो; इसका मतलब शून्य भाव नहीं है।") : l("No verified price records are available. Check the official market portal; sample values are not used.", "पुष्टि योग्य भाव उपलब्ध नहीं हैं। आधिकारिक मंडी पोर्टल देखें; नकली भाव नहीं दिखाए जाते।")}</Empty>}
    <div className="market-next-step"><div><h3>{l("Have a buyer's quote?", "खरीदार का भाव मिला है?")}</h3><p>{l("Compare quotes and costs even when the feed is offline.", "फीड बंद हो तब भी खरीदार के भाव और खर्च की तुलना करें।")}</p></div><NavLink className="primary-link" to="/sales"><Scale size={18}/>{l("Compare buyer quotes", "खरीदारों के भाव की तुलना")}<ArrowUpRight size={17}/></NavLink></div>
    <div className="actions"><a className="text-link" href="https://agmarknet.gov.in/" target="_blank" rel="noreferrer">{l("Open official AGMARKNET prices", "आधिकारिक AGMARKNET भाव")}</a><a className="text-link" href="https://enam.gov.in/" target="_blank" rel="noreferrer">{l("Open e-NAM", "e-NAM खोलें")}</a></div>
    <p className="muted">{l("Up to 200 records are loaded, not every mandi in India. Arrival dates differ from retrieval time. Search preferences stay on this device; no background alerts or price forecasts are claimed.", "अधिकतम 200 रिकॉर्ड आते हैं, भारत की हर मंडी के नहीं। आवक और प्राप्त करने की तारीख अलग होती हैं। खोज की पसंद इस डिवाइस पर रहती है; अपने आप अलर्ट या भाव की भविष्यवाणी नहीं होती।")}</p>
  </>;
}
