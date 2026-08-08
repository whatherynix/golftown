import { CustomerRecord } from '../types';
import { guessGender } from './initialData';
import { parseRowWithSmartAlignment, sanitizeCustomerRecords } from './dataSanitizer';

export const STORE_504_RAW_TEXT = `(OLDER PERIODS HIDDEN)																									
Quarter 1																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)														
Over 30 Days	10/1/2020	10/01/2020	25469599	Rod	MORRISON	RMORRISON@CITY.STRATFORD.ON.CA	4038759458	10.49	KEEP																
Over 30 Days	10/1/2020	02/25/2021	4047340	Store	4	SOUTHCALGARY@GOLFTOWN.COM	4032019301	-10.49	REMOVE																
Over 30 Days	10/19/2020	12/02/2020	888032820	francis	Thomas	JT.RES@HOTMAIL.COM	4038606415	110.22	KEEP																
Over 30 Days	12/30/2020	03/01/2021	4035016	GREG	Hamilton	(blank)	4032711216	157.49	KEEP																
To be cleaned up	3/31/2021	03/31/2021	904012280	lori	Jeffries	(blank)	4036608522	0.01	REMOVE																
																									
Quarter 2																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)														
Over 30 Days	10/1/2020	10/01/2020	25469599	ROD	Morrison	RMORRISON@CITY.STRATFORD.ON.CA	4038759458	10.49	REMOVE	Attempted contacting Rod multiple times, has not responded or used credit															
Over 30 Days	10/19/2020	12/02/2020	888032820	Francis	Thomas	JT.RES@HOTMAIL.COM	4038606415	110.22	KEEP	Contacted customer, said he would come in															
Over 30 Days	4/5/2021	04/05/2021	4033479	Cliff	CAMPBELL	CFCAMPBELL@SHAW.CA	4038612399	1,150.76	REMOVE	SHOULD BE AT $0															
Over 30 Days	4/6/2021	04/06/2021	888803172	THORNE	Thompson	TTHOMPSON@WATEROUSPOWER.COM	4036011447	1,528.19	REMOVE	SHOULD BE AT $0															
Over 30 Days	5/4/2021	05/04/2021	904012184	Mijong	Park	(blank)	4033978236	37.49	KEEP	customer owed refund from special order issue															
Over 30 Days	5/12/2021	05/12/2021	888281151	Tom	Trathen	(blank)	4034735793	125.99	REMOVE	SHOULD BE AT $0															
Over 30 Days	5/20/2021	05/20/2021	504005323	Sam	armstrong	sjoarmst@gmail.com	4037034752	125.99	KEEP	PRODUCT HASN'T ARRIVED YET															
Over 30 Days	5/27/2021	05/27/2021	904012723	Travis	Wowniar	(blank)	4038297465	51.45	KEEP	SPECIAL ORDER WAS CANCELLED, WASN'T REFUNDED FULL AMOUNT															
																									
Quarter 3																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)														
Over 30 Days	10/19/2020	12/02/2020	888032820	Francis	Thomas	JT.RES@HOTMAIL.COM	4038606415	110.22	KEEP	CONTACTED CUSTOMER, MOVING TO GC FRIDAY NEXT WEEK IF FRANCIS DOES NOT COME IN															
Over 30 Days	5/4/2021	08/14/2021	904012184	Mijong	Park	(blank)	4033978236	37.49	KEEP	SPECIAL ORDER DISCOUNT DUE TO TIMELINE, REMIANING VANSON NOT REFUNDED - CONTACTED															
Over 30 Days	5/27/2021	05/27/2021	904012723	Travis	Wowniar	(blank)	4038297465	51.45	KEEP	TOO MUCH TAKEN AT TIME OF VANSON - CONTACTED WILL REFUND															
Over 30 Days	6/1/2021	07/21/2021	904010720	Joel	Lemire	joel.lemire55@gmail.com	4039904196	89.23	N/A	CASHIER ERROR RUNG S.O. UNDER VANSON - USED AT $0															
Over 30 Days	6/16/2021	08/04/2021	4045465	Paul	Billington	(blank)	4039938313	241.38	N/A	CASHIER ERROR RUNG S.O. UNDER VANSON - USED AT $0															
Over 30 Days	6/16/2021	08/21/2021	504000464	rick	Begg	rlbegg@rogers.com	5872271545	1,499.99	KEEP	ORDER HASN'T COME IN															
Over 30 Days	6/24/2021	06/24/2021	904015474	Ken	Smith	(blank)	4036520437	1,979.96	KEEP	ORDER HASN'T COME IN															
Over 30 Days	7/5/2021	07/05/2021	504018143	Keith	Bradley	(blank)	4033320111	1,679.92	KEEP	ORDER HASN'T COME IN															
Over 30 Days	7/9/2021	07/09/2021	904015912	Brayden	Erickson	(blank)	5872261585	1,102.43	KEEP	ORDER HASN'T COME IN															
Over 30 Days	7/18/2021	07/18/2021	904016196	chloe	nielsen	(blank)	5875762456	262.5	KEEP	ORDER HASN'T COME IN															
Over 30 Days	7/30/2021	09/10/2021	504007482	James	cousins	jamescousins@gmail.com	4038742268	1,379.95	KEEP	ORDER HASN'T COME IN															
Over 30 Days	8/8/2021	08/08/2021	504013351	alan	gillespie	gillespie@telefish.net	5874322234	1,511.91	KEEP	ORDER HASN'T COME IN															
Over 30 Days	8/11/2021	08/11/2021	888401462	LOC	DUONG	DUONG_LOC@HOTMAIL.COM	4039702037	749.99	KEEP	PARTIAL WAITING OR OTHER HALF OF ORDER															
Over 30 Days	8/11/2021	08/11/2021	504006263	Victor	Danyluk	danyluk@gmail.com	7809105777	141.75	KEEP	ORDER HASN'T COME IN															
Over 30 Days	8/16/2021	09/26/2021	4054488	Theo	Fleury	theo14@theofleury14.com	5875721400	734.33	KEEP	ORDER HASN'T COME IN															
Over 30 Days	8/24/2021	10/13/2021	904012968	MICHAEL	Pichnej	(blank)	4037012594	188.99	KEEP	ORDER HASN'T COME IN															
Over 30 Days	8/30/2021	08/30/2021	904017214	Adam	Boyes	(blank)	4038500137	2,099.92	KEEP	ORDER HASN'T COME IN															
Over 30 Days	9/8/2021	09/08/2021	904017354	Michelle	Dickinson	(blank)	4036167360	1,034.96	KEEP	ORDER HASN'T COME IN															
Over 30 Days	9/14/2021	09/28/2021	904016417	Yusuf	Ashraf	(blank)	7802455361	1,312.48	KEEP	PARTIAL WAITING ON OTHER HALF OF ORDER															
Over 30 Days	9/16/2021	09/16/2021	904015891	Kim	Sanford	(blank)	4032276737	389.99	KEEP	PARTIAL WAITING ON OTHER HALF OF ORDER															
Over 30 Days	9/16/2021	09/16/2021	7095325	Colby	JOHANNSON	(blank)	6047877481	1,543.47	KEEP	ORDER HASN'T COME IN															
To be cleaned up	7/14/2021	08/13/2021	4061949	darcy	Shand	(blank)	4038036331	0.01	REMOVE																
To be cleaned up	8/11/2021	08/11/2021	904015727	Brian	Ahearn	brianahearn@shaw.ca	4039699901	0.3	REMOVE																
To be cleaned up	9/13/2021	09/13/2021	936014225	Justin	Huberdeau	(blank)	3063806460	0.01	REMOVE																
																									
Quarter 4																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)														
Over 30 Days	10/19/2020	12/02/2020	888032820	francis	Thomas	JT.RES@HOTMAIL.COM	4038606415	110.22	keep	Left msg															
Over 30 Days	5/4/2021	08/14/2021	904012184	Mijong	Park	(blank)	4033978236	37.49	KEEP	CONTACTED - COMING IN TO USE															
Over 30 Days	5/27/2021	05/27/2021	904012723	Travis	Wowniar	(blank)	4038297465	51.45	KEEP	CONTACTED - COMING IN TO USE															
Over 30 Days	8/16/2021	12/21/2021	4054488	Theo	Fleury	theo14@theofleury14.com	5875721400	734.33	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	9/8/2021	12/23/2021	904017354	Michelle	Dickinson	(blank)	4036167360	1,034.96	N/A	USED - RCT# 227497 - 1/19/22															
Over 30 Days	9/14/2021	09/28/2021	904016417	Yusuf	Ashraf	(blank)	7802455361	1,312.48	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	10/11/2021	10/16/2021	888124392	RON	Van Raalten	RVANRAALTEN@ALLSTATE.CA	4038156772	388.49	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	10/13/2021	12/17/2021	888204830	Zul	Allidina	ZULALLIDINA@SHAW.CA	4038618044	1,499.99	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	10/15/2021	10/16/2021	904017757	Debbie	dymianiw	(blank)	4038358895	1,867.48	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	10/21/2021	10/21/2021	904017786	Mike	Berger	(blank)	3066797034	1,469.93	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	10/23/2021	10/23/2021	4053078	Sherrill	Gibson	sherrillgibson@gmail.com	4038509925	367.49	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	10/30/2021	10/30/2021	37109460	Brent	GORDON	BGORDON@TACMOBILITY.COM	4038098369	1,679.99	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	11/9/2021	11/09/2021	904015912	Brayden	Erickson	(blank)	5872261585	314.98	KEEP	ORDER HAS NOT ARRIVED 															
Over 30 Days	11/10/2021	11/27/2021	937001162	kay	KIM	kaykim8555@gmail.com	5874340225	1,679.92	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	11/23/2021	11/23/2021	4060990	Justin	Warthe	JRWARTHE_@HOTMAIL.COM	4036208746	230.99	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	11/24/2021	11/24/2021	888610379	kelly	St.Jean	STJEANK@TELUS.NET	4039983081	2,149.14	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	11/28/2021	12/11/2021	904018045	Bryan	Kenly	bryan@exqelectric.com	5872242127	1,102.43	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	12/7/2021	12/07/2021	537010923	Camille	LeRouge	camille.lerouge@gmail.com	4033837893	230.99	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	12/8/2021	12/08/2021	910007399	Lee	Campbell	(blank)	7788052166	9,573.57	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	12/8/2021	12/08/2021	956003127	Carly	HOWARD	carlyhoward7@hotmail.com	7054271903	2,846.92	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	12/17/2021	12/17/2021	904010654	JOE	Gregory	(blank)	4037633139	1,589.99	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	12/17/2021	12/27/2021	4046038	Brad	LOCK	LOCKFAMILY@SHAW.CA	4038603730	1,966.05	KEEP	ORDER HAS NOT ARRIVED															
Over 30 Days	12/18/2021	12/18/2021	888178895	dean	Custance	CUSSY34@HOTMAIL.COM	4032326483	74.54	KEEP	ORDER HAS NOT ARRIVED															
To be cleaned up	1/10/2022	01/10/2022	527008998	ADAM	Pauliuk	virtualadam@gmail.com	4036162326	0.02	REMOVE																
																									
Quarter 1 (2022)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)														
Over 30 Days	10/19/2020	12/2/2020	888032820	Francis	Thomas	JT.RES@HOTMAIL.COM	4038606415	110.22	keep																
Over 30 Days	5/4/2021	8/14/2021	904012184	Mijong	Park	(blank)	4033978236	37.49	keep																
Over 30 Days	5/27/2021	5/27/2021	904012723	Trevor	Wowniar	(blank)	4038297465	51.45	keep																
Over 30 Days	11/24/2021	2/4/2022	888610379	KELLY	St.jean	STJEANK@TELUS.NET	4039983081	2,149.14	keep																
Over 30 Days	1/31/2022	3/21/2022	904016575	James	Kim	(blank)	4034730625	1,749.76	keep																
Over 30 Days	2/13/2022	2/13/2022	4050054	KEVIN	Chim	KEVIN.CHIM@GMAIL.COM	4038285555	581.69	keep																
Over 30 Days	3/3/2022	4/10/2022	4047966	Stephen	Bekkering	SBEKKERING@HOTMAIL.COM	5877770744	1,225.77	keep																
Over 30 Days	3/11/2022	4/14/2022	904011609	Jacques	Caouette	(blank)	4039181548	503.98	keep																
Over 30 Days	3/12/2022	3/12/2022	927002058	bill	Osman	rimasholdings@gmail.com	4037085670	255.14	keep																
Over 30 Days	3/15/2022	3/15/2022	888213269	Keith	Kyun	MERITPROPERTIES@HOTMAIL.COM	4037105243	692.97	keep																
To be cleaned up	3/20/2022	3/20/2022	904018569	Troy 	YOUNG	dirtking4774@hotmail.com	4035011500	0.02	To be removed																
																									
Quarter 2 (2022)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)														
Over 30 Days	10/19/2020	12/2/2020	888032820	Francis	Thomas	JT.RES@HOTMAIL.COM	4038606415	110.22	keep																
Over 30 Days	5/4/2021	8/14/2021	904012184	Mijong	Park	(blank)	4033978236	37.49	KEEP 																
Over 30 Days	5/27/2021	5/27/2021	904012723	Trevor	Wowniar	(blank)	4038297465	51.45	KEEP 																
Over 30 Days	2/13/2022	6/8/2022	4050054	KEVIN	Chim	KEVIN.CHIM@GMAIL.COM	4038285555	581.69	KEEP 	Long delay on special order for bag															
Over 30 Days	3/11/2022	6/25/2022	904011609	jacques	Caouette	(blank)	4039181548	503.98	KEEP 																
Over 30 Days	3/12/2022	6/24/2022	927002058	Bill	Osman	rimasholdings@gmail.com	4037085670	255.14	KEEP 																
Over 30 Days	5/5/2022	5/5/2022	904020170	Francois	Cusson	(blank)	4032813097	2,377.12	KEEP 																
Over 30 Days	5/20/2022	5/20/2022	888138441	Jonathan	Habok	(blank)	4039234336	2,123.94	KEEP 																
Over 30 Days	5/23/2022	5/23/2022	904010175	Graham	GILBERT	(blank)	5062611268	2,039.94	KEEP 																
Over 30 Days	5/27/2022	5/27/2022	4062672	Lance	Nelson	LANCE@EMPIREPPE.CA	4036183172	312.36	KEEP 																
Over 30 Days	5/30/2022	6/14/2022	904019492	Craig	halford	(blank)	4033902057	262.49	KEEP																
Over 30 Days	6/8/2022	6/8/2022	904020931	Randy	kaminsky	(blank)	4032001443	155.38	KEEP 																
Over 30 Days	6/15/2022	6/15/2022	904020553	Tony	Slade	(blank)	2368187593	9.45	REMOVE																
Over 30 Days	6/16/2022	6/16/2022	904021164	Rene	Angermeier	(blank)	4033590951	944.99	KEEP 																
Over 30 Days	6/17/2022	6/17/2022	4047091	Brent	Clarke	BVCLARKE@SHAW.CA	4035613271	209.99	KEEP																
Over 30 Days	6/17/2022	6/21/2022	904002448	duane	arndt	(blank)	4039935095	1,397.21	KEEP 																
To be cleaned up	4/26/2022	5/4/2022	904019527	Jordan	Brennan	(blank)	2504253806	0.01	REMOVE																
To be cleaned up	5/10/2022	5/10/2022	888213269	Keith	Kyun	MERITPROPERTIES@HOTMAIL.COM	4037105243	0.02	REMOVE																
To be cleaned up	5/11/2022	5/11/2022	904019401	STEVE	Janz	(blank)	4038502761	0.01	REMOVE																
To be cleaned up	5/13/2022	5/13/2022	904020200	louise	proulx	(blank)	5878936832	0.01	REMOVE																
																									
Quarter 3 (2022)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	10/19/2020	12/2/2020	888032820	Francis	Thomas	(blank)	JT.RES@HOTMAIL.COM	4038606415	110.22	KEEP	Customer lives out of town														
Over 30 Days	5/4/2021	8/14/2021	904012184	Mijong	Park	(blank)	(blank)	4033978236	37.49	KEEP															
Over 30 Days	5/27/2021	5/27/2021	904012723	Trevor	Wowniar	(blank)	(blank)	4038297465	51.45	KEEP															
Over 30 Days	5/27/2022	5/27/2022	4062672	Lance	Nelson	(blank)	LANCE@EMPIREPPE.CA	4036183172	312.36	KEEP	Long delay on special order														
Over 30 Days	8/4/2022	8/4/2022	904022383	Giovanni	Fileccia	(blank)	(blank)	4033692810	734.99	KEEP															
Over 30 Days	8/17/2022	8/18/2022	904017180	Tammi	Andrew	(blank)	(blank)	4037010529	105	KEEP															
Over 30 Days	9/2/2022	9/2/2022	4066694	Chris	Burke	(blank)	CHRIS_BURKE7@HOTMAIL.COM	4039198918	1,858.45	KEEP															
To be cleaned up	9/19/2022	9/19/2022	904023466	Loralie	mahan	(blank)	(blank)	4036152565	0.01	REMOVE															
To be cleaned up	10/3/2022	10/3/2022	904012112	Wynn	Carr	(blank)	(blank)	4035899019	0.04	REMOVE															
																									
																									
Quarter 4 (2022)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	10/19/2020	12/2/2020	888032820	Francis	Thomas	(blank)	JT.RES@HOTMAIL.COM	4038606415	110.22	KEEP 															
Over 30 Days	5/4/2021	8/14/2021	904012184	Mijong	Park	(blank)	(blank)	4033978236	37.49	REMOVE															
Over 30 Days	8/4/2022	8/4/2022	904022383	Giovanni	Fileccia	(blank)	(blank)	4033692810	734.99	KEEP 															
Over 30 Days	8/17/2022	8/18/2022	904017180	Tammi	Andrew	(blank)	(blank)	4037010529	105	KEEP 															
Over 30 Days	9/29/2022	10/31/2022	888138441	Jonathan	Habok	(blank)	(blank)	4039234336	84	KEEP 															
Over 30 Days	12/13/2022	12/13/2022	904022729	Kevin	Stengler	(blank)	(blank)	4036340874	254.99	KEEP 															
																									
																									
Quarter 1 (2023)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	10/19/2020	12/2/2020	888032820	Francis	Thomas	(blank)	JT.RES@HOTMAIL.COM	4038606415	110.22	KEEP															
Over 30 Days	8/4/2022	8/4/2022	904022383	Giovanni	Fileccia	(blank)	(blank)	4033692810	734.99	KEEP															
Over 30 Days	8/17/2022	8/18/2022	904017180	Tammi	Andrew	(blank)	(blank)	4037010529	105	KEEP															
Over 30 Days	9/29/2022	10/31/2022	888138441	Jonathan	Habok	(blank)	(blank)	4039234336	84	KEEP															
Over 30 Days	1/29/2023	4/8/2023	937004673	Justin	Pruden	(blank)	(blank)	4034650103	251.99	KEEP															
Over 30 Days	2/7/2023	4/9/2023	904007249	Corbin	Tod	(blank)	corbin.harrison.tod@gmail.com	5875808428	152.08	KEEP															
Over 30 Days	2/7/2023	4/12/2023	904017496	Lucas	Ortega	(blank)	(blank)	4034669004	58.8	KEEP															
Over 30 Days	2/27/2023	2/27/2023	888038615	Christian	Girard	(blank)	christiangirard19@hotmail.com	4035852037	503.98	KEEP															
Over 30 Days	3/8/2023	3/12/2023	504010788	Gord	Lee	(blank)	gordandoi@shaw.ca	4035891321	1,165.50	KEEP															
Over 30 Days	3/13/2023	3/13/2023	904022664	Ryan	Walsh	renegade draught co INC	renegadedraught@gmail.com	8254383745	241.49	KEEP															
Over 30 Days	3/14/2023	3/18/2023	904025313	Derek	metituk	(blank)	(blank)	5879989948	531.29	KEEP															
Over 30 Days	3/14/2023	3/14/2023	4045915	TAI	TIEU	(blank)	TAITIEU@GMAIL.COM	4033709523	419.99	KEEP															
Over 30 Days	3/15/2023	3/15/2023	4065544	judy	wang	(blank)	W4038896129@HOTMAIL.COM.TW	4038896129	262.5	KEEP															
Over 30 Days	3/16/2023	3/16/2023	4064782	Morgan	Thiemann	(blank)	MORTEEMAN@LIVE.COM	4036139046	907.19	KEEP															
Over 30 Days	3/17/2023	3/17/2023	927001039	Scott	Macisaac	(blank)	scott.macisaac@encana.com	4038698978	839.99	KEEP															
Over 30 Days	3/17/2023	4/3/2023	4053011	sandy	kumpic	(blank)	whynotask@hotmail.com	4036815614	157.5	KEEP															
Over 30 Days	3/18/2023	3/18/2023	4046274	JASON	Hart	(blank)	JASONHART13@GMAIL.COM	4034044278	1,484.97	KEEP															
Over 30 Days	3/19/2023	3/19/2023	4056261	rene	Coquet	(blank)	(blank)	4038366589	2,376.53	KEEP															
To be cleaned up	2/3/2023	2/26/2023	888646617	Reid	Cordelle	(blank)	REIDCORDELLE@HOTMAIL.COM	4036503836	0.01	REMOVE															
To be cleaned up	2/13/2023	2/23/2023	927011598	terry	Krahn	(blank)	(blank)	4037015834	0.01	REMOVE															
To be cleaned up	2/24/2023	2/24/2023	904024897	Greg	Bilcik	(blank)	(blank)	2502540044	0.1	REMOVE															
To be cleaned up	3/9/2023	3/10/2023	904025083	Peter	chapman	(blank)	(blank)	4038311242	0.04	REMOVE															
To be cleaned up	3/10/2023	3/14/2023	4048110	lynn	Thomas	(blank)	LYNNTHOMAS@SHAW.CA	4032563397	0.03	REMOVE															
To be cleaned up	3/13/2023	4/13/2023	904024947	Dale	Lakusta	(blank)	(blank)	4036902354	0.05	REMOVE															
To be cleaned up	3/14/2023	3/14/2023	904020056	Chris	REID	(blank)	(blank)	5877272277	0.01	REMOVE															
To be cleaned up	3/21/2023	3/26/2023	888266145	Karin	Smith	(blank)	(blank)	4035199121	0.01	REMOVE															
To be cleaned up	4/11/2023	4/11/2023	904024794	Chris	lapointe	(blank)	(blank)	4038283289	0.01	REMOVE															
																									
Quarter 2 (2023)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	10/19/2020	12/2/2020	888032820	Francis	Thomas	(blank)	JT.RES@HOTMAIL.COM	4038606415	110.22	USED ON REC#330189															
Over 30 Days	8/4/2022	8/4/2022	904022383	Giovanni	Fileccia	(blank)	(blank)	4033692810	734.99	USED ON REC#330204															
Over 30 Days	8/17/2022	8/18/2022	904017180	Tammi	Andrew	(blank)	(blank)	4037010529	105	USED ON REC#330183															
Over 30 Days	9/29/2022	7/5/2023	888138441	Jonathan	Habok	(blank)	(blank)	4039234336	84	USED ON REC#330184															
Over 30 Days	2/7/2023	6/23/2023	904007249	Corbin	Tod	(blank)	corbin.harrison.tod@gmail.com	5875808428	152.08	USING TONIGHT TO RECTIFY EMPLOYEE PURCHASE MADE IN FEB															
Over 30 Days	4/24/2023	6/10/2023	904007874	RON	Odagaki	(blank)	(blank)	4038603050	183.75	KEEP															
Over 30 Days	5/13/2023	5/13/2023	504008137	Mark 	Tonner 	(blank)	mtonner321@gmail.com	4035423358	2,000.00	USED ON REC#327363															
Over 30 Days	5/24/2023	5/24/2023	904001227	TERRY	Taylor	(blank)	(blank)	4038155128	215.25	KEEP															
Over 30 Days	6/15/2023	6/20/2023	904011556	Kyle	bachus	(blank)	(blank)	5875751910	52.49	KEEP															
Over 30 Days	6/16/2023	6/16/2023	904027280	Connie 	Dodd	(blank)	(blank)	5878943495	224.99	KEEP															
Over 30 Days	6/16/2023	7/2/2023	232000739	MATT	Pariseau	(blank)	mpariseau_8@hotmail.com	4033320930	2,039.99	KEEP															
To be cleaned up	5/19/2023	6/23/2023	904017280	Sean	Waits	(blank)	(blank)	5879982393	0.4	Remove															
To be cleaned up	5/25/2023	5/25/2023	904026528	Tim	wiebe	(blank)	(blank)	4033070313	0.01	Remove															
																									
Quarter 3 (2023)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	6/30/2023	8/26/2023	904028017	Matt	Neil	(blank)	MNEIL3@ME.COM	4033719524	806.37	Keep															
Over 30 Days	7/8/2023	7/8/2023	904017084	Bill	Walker	(blank)	(blank)	4038744788	356.99	Keep															
Over 30 Days	7/28/2023	7/28/2023	904028248	Sandy	Anderson	(blank)	awa.anderson@gmail.com	2503482008	15.75	Removed last week															
Over 30 Days	8/17/2023	8/17/2023	232000739	Matt	Pariseau	(blank)	mpariseau_8@hotmail.com	4033320930	156.55	Remove remaining															
Over 30 Days	9/5/2023	9/5/2023	27692123	DON	Bresee	(blank)	DKBRESEE@TELUSPLANET.NET	5872240506	52.49	Removed															
Over 30 Days	9/7/2023	9/7/2023	904003366	wes	CROWE	(blank)	(blank)	4034626639	57.74	RCT# 345331															
Over 30 Days	9/11/2023	9/11/2023	904029920	Leslie	Wilkie	(blank)	(blank)	(blank)	577.49	Keep															
Over 30 Days	9/15/2023	9/15/2023	927006378	Mike	Gilligan	(blank)	(blank)	4032011435	157.49	RCT# 344988															
To be cleaned up	8/10/2023	9/29/2023	888578898	Jay	Angerilli	(blank)	ANGERILLI@SHAW.CA	4036054110	0.01	TO BE REMOVED-PC															
To be cleaned up	8/16/2023	8/16/2023	904002695	Roy	turner	(blank)	(blank)	4034376257	0.02	TO BE REMOVED-PC															
To be cleaned up	8/17/2023	8/17/2023	888286510	Jaret	Miller	(blank)	JARETM@TELUS.NET	4036691714	0.01	TO BE REMOVED-PC															
																									
Quarter 4 (2023)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	11/3/2023	11/3/2023	904028615	Patrick	burke	(blank)	pgburke@shaw.ca	5872263485	456.75	KEEP															
Over 30 Days	11/27/2023	12/12/2023	504005370	Bob	Watson	(blank)	(blank)	4032560573	88.19	KEEP															
Over 30 Days	11/30/2023	11/30/2023	4056796	Mike	Robinson	(blank)	MIKER77@SHAW.CA	4032792970	970.18	KEEP															
																									
Quarter 1 (2024)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	11/15/2018	3/29/2024	888274137	Dan	Lambert	(blank)	(blank)	(blank)	257.22	KEEP															
Over 30 Days	4/27/2019	4/2/2024	888054257	Michael	Olson	(blank)	(blank)	(blank)	262.47	KEEP															
Over 30 Days	9/9/2021	4/13/2024	927002122	Lisa	Arcega	(blank)	(blank)	(blank)	796.95	PROCESSED															
Over 30 Days	7/8/2022	4/11/2024	904021722	Katrina	O'Reilly	(blank)	(blank)	(blank)	2,430.15	PROCESSED															
Over 30 Days	7/14/2022	4/19/2024	45002201	jordan	Daniels	(blank)	(blank)	(blank)	417.36	KEEP															
Over 30 Days	9/2/2022	4/15/2024	904023318	Patrick	Mattheis	(blank)	(blank)	(blank)	839.99	KEEP															
Over 30 Days	5/1/2023	4/9/2024	888035172	Sheldon	Norquay	(blank)	(blank)	(blank)	92.4	KEEP															
Over 30 Days	2/8/2024	2/8/2024	904031231	Tom	barnes	(blank)	(blank)	(blank)	31.23	KEEP															
Over 30 Days	2/9/2024	2/9/2024	937003567	Matt	Chapman	(blank)	(blank)	(blank)	2,099.91	PROCESSED															
Over 30 Days	2/24/2024	2/24/2024	904031489	Max	Wilcox	(blank)	(blank)	(blank)	251.99	KEEP															
Over 30 Days	2/24/2024	3/16/2024	904008670	Matt	Hetchler	(blank)	(blank)	(blank)	42	KEEP															
Over 30 Days	3/7/2024	4/11/2024	904031527	Jim	eliason	(blank)	(blank)	(blank)	1,396.48	KEEP															
Over 30 Days	3/19/2024	3/19/2024	904025189	Garth	Lawless	(blank)	(blank)	(blank)	1,378.07	PROCESSED															
Over 30 Days	3/21/2024	3/21/2024	904031748	John	Hallam	(blank)	(blank)	(blank)	839.99	KEEP															
Over 30 Days	3/23/2024	4/9/2024	904031774	Nathan	Gurr	(blank)	(blank)	(blank)	1,123.62	KEEP															
Over 30 Days	3/23/2024	4/13/2024	888519566	Rob	Suik	(blank)	(blank)	(blank)	147	KEEP															
																									
																									
Quarter 2 (2024)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	2/12/2020	6/23/2020	999100007	DAX	BREWSTER	Cottonwood Golf & Country Club	daxb@cottonwoodgc.com	4039387200	245.83	KEEP															
Over 30 Days	12/19/2023	12/19/2023	999102045	Ametek	CORPORATE Account	Ametek	rod.merz@ametek.com	4032358400	51.45	KEEP															
Over 30 Days	2/8/2024	2/8/2024	904031231	tom	barnes	(blank)	(blank)	4033939091	31.23	KEEP															
Over 30 Days	4/30/2024	4/30/2024	27691048	hal	khuu	(blank)	HALKHUU@HOTMAIL.COM	4034636284	21	KEEP															
Over 30 Days	5/7/2024	6/17/2024	888000221	dave	Mah	(blank)	DAVEM@CTCMAGAZINES.COM	4036151572	62.46	KEEP															
Over 30 Days	5/16/2024	5/16/2024	904029437	raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP															
Over 30 Days	5/19/2024	5/27/2024	37130348	Stephen	Hope	(blank)	(blank)	4038279650	419.97	KEEP															
Over 30 Days	5/21/2024	5/28/2024	937010095	Brenda	Sim	(blank)	(blank)	4038896090	593.25	KEEP															
Over 30 Days	5/25/2024	7/5/2024	904024954	Hyokjong	kWON	(blank)	(blank)	4036072242	1,128.75	KEEP															
Over 30 Days	5/28/2024	5/28/2024	904004974	Jim	HUNT	(blank)	jimhunt99@gmail.com	4032787841	1,663.16	KEEP															
Over 30 Days	6/4/2024	6/18/2024	4056159	Tj	Calara	(blank)	(blank)	4036065492	2,219.95	KEEP															
Over 30 Days	6/9/2024	6/22/2024	27694876	JASON	Bazylinski	(blank)	JASON.BASYLINSKI@SHAW.CA	4032413991	18.9	KEEP															
Over 30 Days	6/11/2024	6/11/2024	937012074	JASON	Ngo	(blank)	(blank)	5879983088	472.49	KEEP															
Over 30 Days	6/12/2024	6/12/2024	904033462	Mark	Calkhoven	(blank)	markcalkhoven@gmail.com	(blank)	1,559.96	KEEP															
To be cleaned up	4/29/2024	5/5/2024	904014330	Tabitha	Tatum	(blank)	(blank)	3106966591	0	TO BE REMOVED-PC															
To be cleaned up	6/3/2024	6/3/2024	999102813	Lennow Industries Ltd.	CORPORATE Account	Lennox Industries Ltd.	cathy.macewen@lennoxind.com	5879971532	0.01	TO BE REMOVED-PC															
To be cleaned up	6/6/2024	6/7/2024	888138250	Darren	tait	(blank)	DAROLE@TELUS.NET	4036400459	0.08	TO BE REMOVED-PC															
																									
Quarter 3 (2024)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	2/12/2020	6/23/2020	999100007	Dax	BREWSTER	Cottonwood Golf & Country Club	daxb@cottonwoodgc.com	4039387200	245.83	KEEP															
Over 30 Days	12/19/2023	12/19/2023	999102045	Ametek	CORPORATE Account	Ametek	rod.merz@ametek.com	4032358400	51.45	KEEP															
Over 30 Days	2/8/2024	2/8/2024	904031231	tom	barnes	(blank)	(blank)	4033939091	31.23	KEEP															
Over 30 Days	4/30/2024	4/30/2024	27691048	hal	khuu	(blank)	HALKHUU@HOTMAIL.COM	4034636284	21	KEEP															
Over 30 Days	5/7/2024	6/17/2024	888000221	Dave	Mah	(blank)	DAVEM@CTCMAGAZINES.COM	4036151572	62.46	KEEP															
Over 30 Days	5/16/2024	5/16/2024	904029437	raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP															
Over 30 Days	5/21/2024	5/28/2024	937010095	Brenda	Sim	(blank)	(blank)	4038896090	593.25	KEEP															
Over 30 Days	5/25/2024	10/4/2024	904024954	Hyokjong	kWON	(blank)	(blank)	4036072242	1,128.75	KEEP															
Over 30 Days	6/15/2024	7/29/2024	904029425	Crystal	Samela	(blank)	(blank)	4038806999	251.99	KEEP															
Over 30 Days	6/19/2024	9/23/2024	888515301	David Reis	CORPORATE Account	Benjamin Moore Co.	dreis70@gmail.com	4034634730	3.19	REMOVE															
Over 30 Days	6/19/2024	10/4/2024	954016146	Kessler	Bishop	(blank)	(blank)	4036649122	498.04	KEEP															
Over 30 Days	7/10/2024	9/9/2024	4032718	robert	BRANDER	(blank)	t21brander@yahoo.com	4039690907	52.5	KEEP															
Over 30 Days	7/13/2024	7/13/2024	527010400	Cameron	Olson	(blank)	cameron.olson@me.com	4036128375	1.25	REMOVE															
Over 30 Days	7/27/2024	7/27/2024	27677005	Joe	horler	(blank)	JHORLER@SHAW.CA	4032548725	273	KEEP															
Over 30 Days	7/30/2024	9/21/2024	937000042	Dax	BREWSTER	(blank)	dbrewster@golftown.com	4036813449	881.97	KEEP															
Over 30 Days	8/9/2024	8/16/2024	904020038	Jeremy	Hart	(blank)	(blank)	5874327451	80.47	KEEP															
Over 30 Days	8/21/2024	8/21/2024	4051617	Mike	Noblett	(blank)	(blank)	4036291499	41.99	KEEP															
Over 30 Days	8/29/2024	8/29/2024	904011544	CSN Wine & Spirits	CORPORATE Account	CSN Wine & Spirits	(blank)	4036894346	791.55	KEEP															
Over 30 Days	8/30/2024	9/26/2024	904008209	Jamie	Petit	(blank)	(blank)	4033718756	21	KEEP															
Over 30 Days	9/7/2024	9/7/2024	904035276	Kevin	Bird	(blank)	(blank)	4035875227	382.19	KEEP															
To be cleaned up	7/15/2024	7/15/2024	904034091	melanie	Nahayowski	(blank)	(blank)	4038131776	0.4	REMOVE															
To be cleaned up	8/13/2024	8/13/2024	904032859	Marc	Staniloff	(blank)	(blank)	4038609488	0.01	REMOVE															
To be cleaned up	9/18/2024	9/18/2024	999101607	Prairie West Meats	CORPORATE Account	Prairie West Meats	taras@cfoods.ca	4033395229	0.08	REMOVE															
																									
Quarter 4 (2024)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	2/12/2020	6/23/2020	999100007	DAX	BREWSTER	Cottonwood Golf & Country Club	daxb@cottonwoodgc.com	4039387200	245.83	KEEP															
Over 30 Days	2/8/2024	2/8/2024	904031231	tom	barnes	(blank)	(blank)	4033939091	31.23	REMOVE															
Over 30 Days	4/30/2024	12/28/2024	27691048	Hal	khuu	(blank)	HALKHUU@HOTMAIL.COM	4034636284	21	KEEP															
Over 30 Days	5/7/2024	1/5/2025	888000221	Dave	Mah	(blank)	DAVEM@CTCMAGAZINES.COM	4036151572	62.46	KEEP															
Over 30 Days	5/16/2024	5/16/2024	904029437	raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP															
Over 30 Days	7/10/2024	12/3/2024	4032718	Robert	BRANDER	(blank)	t21brander@yahoo.com	4039690907	52.5	Processed															
Over 30 Days	7/13/2024	11/17/2024	527010400	Cameron	Olson	(blank)	cameron.olson@me.com	4036128375	1.25	REMOVE															
Over 30 Days	7/27/2024	7/27/2024	27677005	Joe	horler	(blank)	JHORLER@SHAW.CA	4032548725	273	Processed															
Over 30 Days	7/30/2024	9/21/2024	937000042	DAX	BREWSTER	(blank)	dbrewster@golftown.com	4036813449	881.97	Processed															
Over 30 Days	8/30/2024	9/26/2024	904008209	Jamie	Petit	(blank)	(blank)	4033718756	21	KEEP															
Over 30 Days	9/20/2024	9/20/2024	888816706	Terry	PEARCE	(blank)	PEARCETERRY@SHAW.CA	4035197150	83.99	KEEP															
Over 30 Days	10/4/2024	10/11/2024	904035551	Gordon	Cheney	(blank)	(blank)	4038540582	382.03	KEEP															
Over 30 Days	10/10/2024	10/10/2024	937019962	Logan	Biever	(blank)	(blank)	5204140012	251.9	KEEP															
Over 30 Days	10/22/2024	12/13/2024	888305832	dan	Dubeau	(blank)	(blank)	4036015278	308.69	KEEP															
Over 30 Days	10/29/2024	10/29/2024	888401462	LOC	DUONG	(blank)	DUONG_LOC@HOTMAIL.COM	4039702037	482.98	KEEP															
Over 30 Days	11/21/2024	11/21/2024	888160299	RICHARD	Corvari	(blank)	RICHARD-CORVARI@SHAW.CA	2508092588	735	KEEP															
Over 30 Days	11/30/2024	11/30/2024	904027334	Kenny	Nicholls	(blank)	(blank)	4036204761	629.99	KEEP															
Over 30 Days	11/30/2024	12/22/2024	4054103	Steven	Burke	(blank)	CSBURKE@SHAW.CA	4037712103	272.99	Processed															
Over 30 Days	12/7/2024	12/23/2024	888125725	Dave	Rogers	(blank)	DAVE.ROGERS@SHAW.CA	4032716277	75.58	KEEP															
To be cleaned up	10/11/2024	10/11/2024	904035322	CHRIS	Revereza	(blank)	(blank)	4036144665	0.02	REMOVE															
To be cleaned up	10/21/2024	10/21/2024	904011544	CSN Wine & Spirits	CORPORATE Account	CSN Wine & Spirits	(blank)	4036894346	0.01	REMOVE															
To be cleaned up	11/29/2024	12/7/2024	904035840	Adam	klinzmann	(blank)	(blank)	4036505066	0.02	REMOVE															
To be cleaned up	12/4/2024	12/4/2024	904012220	brent	davey	(blank)	(blank)	9052441365	0.03	REMOVE															
																									
																									
Quarter 1 (2025)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	2/12/2020	6/23/2020	999100007	Dax	BREWSTER	Cottonwood Golf & Country Club	daxb@cottonwoodgc.com	4039387200	245.83	KEEP															
Over 30 Days	4/30/2024	2/17/2025	27691048	Hal	khuu	(blank)	HALKHUU@HOTMAIL.COM	4034636284	21	REMOVE															
Over 30 Days	5/16/2024	5/16/2024	904029437	Raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP															
Over 30 Days	7/13/2024	11/17/2024	527010400	Cameron	Olson	(blank)	cameron.olson@me.com	4036128375	1.25	REMOVE															
Over 30 Days	8/30/2024	3/15/2025	904008209	jamie	Petit	(blank)	(blank)	4033718756	21	REMOVE															
Over 30 Days	9/20/2024	9/20/2024	888816706	Terry	PEARCE	(blank)	PEARCETERRY@SHAW.CA	4035197150	83.99	REMOVE															
Over 30 Days	10/4/2024	10/11/2024	904035551	Gordon	Cheney	(blank)	(blank)	4038540582	382.03	KEEP															
Over 30 Days	10/10/2024	1/12/2025	937019962	logan	Biever	(blank)	(blank)	5204140012	251.9	KEEP															
Over 30 Days	10/22/2024	2/21/2025	888305832	Dan	Dubeau	(blank)	(blank)	4036015278	308.69	KEEP															
Over 30 Days	11/21/2024	1/15/2025	888160299	Richard	Corvari	(blank)	RICHARD-CORVARI@SHAW.CA	2508092588	735	KEEP															
Over 30 Days	12/14/2024	12/14/2024	904035972	Glenn	Vanidenstine	(blank)	(blank)	4037025788	548.38	KEEP															
Over 30 Days	1/6/2025	1/6/2025	904026952	ROB	CENNON	(blank)	ROBCENNON@GMAIL.COM	8259942532	385.86	KEEP															
Over 30 Days	1/23/2025	3/17/2025	904034988	Cori	Fraser	(blank)	(blank)	4033151283	596.17	KEEP															
Over 30 Days	1/28/2025	1/28/2025	888000221	Dave	Mah	(blank)	DAVEM@CTCMAGAZINES.COM	4036151572	62.46	REMOVE															
Over 30 Days	2/11/2025	2/22/2025	504005441	Oliver 	Hunt 	(blank)	oliver.hunt4@gmail.com	4038130466	283.5	KEEP															
Over 30 Days	2/17/2025	2/17/2025	27683600	jeff	Macdonald	(blank)	JEFF@SUREFIREINDUSTRIES.CA	4032009869	157.5	PROCESSED															
Over 30 Days	2/17/2025	4/5/2025	23376903	mike	FITZGERALD	(blank)	mikeotto54@hotmail.com	7809014003	409.5	KEEP															
Over 30 Days	2/21/2025	4/1/2025	527004710	Dale	Murdock	(blank)	dm@hotmail.com	3065512298	944.98	KEEP															
Over 30 Days	3/1/2025	3/1/2025	904003265	Emerson	Frostad	(blank)	(blank)	4033831358	314.94	KEEP															
Over 30 Days	3/7/2025	4/6/2025	904007688	johnny	Audia	(blank)	(blank)	4035852834	1,241.99	KEEP															
Over 30 Days	3/8/2025	4/5/2025	4036710	jeff	Dods	(blank)	JEFF@TRUEFENCE.COM	4033718276	2,932.58	KEEP															
																									
																									
Quarter 2 (2025)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	2/12/2020	6/23/2020	999100007	Dax	Brewster	Cottonwood Golf & Country Club	daxb@cottonwoodgc.com	4039387200	245.83	KEEP															
Over 30 Days	5/16/2024	6/25/2025	904029437	Raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP															
Over 30 Days	10/4/2024	10/11/2024	904035551	Gordon	Cheney	(blank)	(blank)	4038540582	382.03	KEEP															
Over 30 Days	10/10/2024	1/12/2025	937019962	Logan	Biever	(blank)	(blank)	5204140012	251.9	KEEP															
Over 30 Days	10/22/2024	4/16/2025	888305832	Dan	Dubeau	(blank)	(blank)	4036015278	308.69	KEEP															
Over 30 Days	11/21/2024	1/15/2025	888160299	Richard	Corvari	(blank)	RICHARD-CORVARI@SHAW.CA	2508092588	735	KEEP															
Over 30 Days	12/14/2024	12/14/2024	904035972	GLENN	Vanidenstine	(blank)	(blank)	4037025788	548.38	KEEP 															
Over 30 Days	1/28/2025	1/28/2025	888000221	Dave	Mah	(blank)	DAVEM@CTCMAGAZINES.COM	4036151572	62.46	KEEP															
Over 30 Days	2/11/2025	7/6/2025	504005441	OLIVER 	Hunt 	(blank)	oliver.hunt4@gmail.com	4038130466	283.5	KEEP															
Over 30 Days	2/21/2025	7/2/2025	527004710	Dale	Murdock	(blank)	dm@hotmail.com	3065512298	944.98	KEEP 															
Over 30 Days	3/7/2025	5/20/2025	904007688	Johnny	Audia	(blank)	(blank)	4035852834	1,241.99	KEEP 															
Over 30 Days	3/13/2025	3/13/2025	27689725	Darrin	Lavialette	(blank)	darrinhemi@shaw.ca	4038270085	68.24	KEEP 															
Over 30 Days	3/20/2025	7/3/2025	954016146	Kessler	Bishop	(blank)	(blank)	4036649122	369.6	KEEP 															
Over 30 Days	3/31/2025	6/9/2025	504011702	darrel	leray	(blank)	null@shaw.ca	4038364077	734.99	KEEP															
Over 30 Days	4/28/2025	4/28/2025	904031626	Kenton	Van Doesburg	(blank)	kentonvandoesburg@gmail.com	5878941818	1.96	REMOVE															
Over 30 Days	5/14/2025	6/5/2025	504007994	Corey	Conlon	(blank)	coreycolnlon19@gmail.com	7802287479	52.49	KEEP 															
Over 30 Days	5/22/2025	5/22/2025	37118961	kent	webber	(blank)	KENTGWEBBER@GMAIL.COM	4038701048	1,442.13	KEEP															
Over 30 Days	5/27/2025	5/27/2025	904038195	Teresa	Augustyn	(blank)	(blank)	4034646844	374.93	KEEP															
Over 30 Days	5/28/2025	5/28/2025	904033493	Chris	chartrand	(blank)	chrisbchartrand@gmail.com	5878915617	912.73	KEEP 															
Over 30 Days	5/28/2025	7/6/2025	999105049	jason	Chau	Canadian Sleep Surgery Clinic	jasonchau88@yahoo.com	4039928383	647.85	KEEP															
Over 30 Days	5/30/2025	6/8/2025	504016489	Gordon	robertson	(blank)	(blank)	4036690913	601.11	KEEP															
																									
																									
Quarter 3 (2025)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	2/12/2020	6/23/2020	999100007	Dax	Brewster	Cottonwood Golf & Country Club	daxb@cottonwoodgc.com	4039387200	245.83	KEEP															
Over 30 Days	5/16/2024	6/25/2025	904029437	raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP															
Over 30 Days	2/21/2025	8/16/2025	527004710	Dale	Murdock	(blank)	dm@hotmail.com	3065512298	944.98	KEEP															
Over 30 Days	5/14/2025	6/5/2025	504007994	Corey	Conlon	(blank)	coreycolnlon19@gmail.com	7802287479	52.49	KEEP															
Over 30 Days	5/27/2025	5/27/2025	904038195	Teresa	Augustyn	(blank)	(blank)	4034646844	374.93	PROCESSED															
Over 30 Days	6/14/2025	6/14/2025	4043164	Greg	Horne	(blank)	null@shaw.ca	5877777460	64.58	KEEP															
Over 30 Days	6/30/2025	6/30/2025	905023139	Michael	Kindrachuk	(blank)	mnkindrachuk@gmail.com	3067173916	59.98	REMOVE															
Over 30 Days	7/1/2025	8/27/2025	504012974	Domingo	Alvarado	(blank)	(blank)	4037008248	31.49	PROCESSED															
Over 30 Days	7/5/2025	7/5/2025	504009013	Charles	Cheon	(blank)	null@shaw.ca	5872278949	13.65	KEEP															
Over 30 Days	7/17/2025	7/17/2025	904039395	Max	Dodd	(blank)	(blank)	2504157496	1,469.93	KEEP															
Over 30 Days	7/19/2025	9/4/2025	904039446	Audra	Ford	(blank)	audra.rawlinson@gmail.com	4038628278	104.99	KEEP															
Over 30 Days	7/23/2025	8/28/2025	888056165	Greg	Hine	(blank)	(blank)	9054644363	356.97	PROCESSED															
Over 30 Days	7/26/2025	8/30/2025	504016489	gordon	Robertson	(blank)	(blank)	4036690913	18.38	REMOVE															
Over 30 Days	7/28/2025	9/12/2025	904014712	David	Meyer	(blank)	(blank)	4039218187	157.5	KEEP															
Over 30 Days	8/1/2025	8/1/2025	904035972	Glenn	Vanidenstine	(blank)	(blank)	4037025788	26.11	REMOVE															
Over 30 Days	8/1/2025	9/18/2025	904007688	Johnny	Audia	(blank)	(blank)	4035852834	59.16	REMOVE															
Over 30 Days	8/6/2025	8/6/2025	906025769	Jugaansan 	Thayalan	Tamil Golfers Network	(blank)	6473393927	140.11	KEEP															
Over 30 Days	8/14/2025	8/14/2025	904039952	Hudson	Brett	(blank)	(blank)	8254317931	810.6	KEEP															
Over 30 Days	8/14/2025	8/14/2025	4036379	Ron	Kellam	(blank)	RGKELLAM@HUGHES.NET	4032575454	965.98	KEEP															
Over 30 Days	8/22/2025	8/28/2025	888637188	taylor	burnside	(blank)	TAYLOR_BURNSIDE@HOTMAIL.COM	4039731776	503.99	PROCESSED															
Over 30 Days	8/28/2025	8/28/2025	904040193	bernie	Parsons	(blank)	(blank)	7802152999	64.98	KEEP															
Over 30 Days	9/3/2025	9/3/2025	4059427	Crystal	Wong	(blank)	CWONG1@TELUSPLANET.NET	2502170158	26.25	PROCESSED															
																									
																									
Quarter 4 (2025)																									
Store Credit Aging	LAST CREATED_DATE	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	Company	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS	Approved by (Full Name)													
Over 30 Days	5/16/2024	6/25/2025	904029437	raymond	mcguines	(blank)	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP 															
Over 30 Days	2/21/2025	8/16/2025	527004710	Dale	Murdock	(blank)	dm@hotmail.com	3065512298	944.98	KEEP 															
Over 30 Days	5/14/2025	6/5/2025	504007994	Corey	Conlon	(blank)	coreycolnlon19@gmail.com	7802287479	52.49	PROCESSED															
Over 30 Days	7/5/2025	7/5/2025	504009013	Charles	Cheon	(blank)	null@shaw.ca	5872278949	13.65	PROCESSED															
Over 30 Days	7/19/2025	9/4/2025	904039446	Audra	Ford	(blank)	audra.rawlinson@gmail.com	4038628278	104.99	PROCESSED															
Over 30 Days	8/6/2025	8/6/2025	906025769	Jugaansan 	Thayalan	Tamil Golfers Network	(blank)	6473393927	140.11	KEEP															
Over 30 Days	10/4/2025	11/15/2025	27683775	Kevin	Taillefer	(blank)	KEVIN.TAILLEFER@ALTUSENERGY.COM	4036892171	543.89	KEEP															
Over 30 Days	10/14/2025	10/14/2025	4036379	Ron	Kellam	(blank)	RGKELLAM@HUGHES.NET	4032575454	524.99	KEEP 															
Over 30 Days	10/23/2025	10/23/2025	888149826	Derrick	Williams	(blank)	(blank)	4034651191	62.99	PROCESSED															
Over 30 Days	11/8/2025	11/8/2025	904001651	rachael	bradley	(blank)	(blank)	4037020188	157.5	PROCESSED															
Over 30 Days	11/29/2025	11/29/2025	504004602	Aaron	Lawrick	(blank)	air_law@hotmail.com	5872242886	1,547.27	KEEP 															
Over 30 Days	12/5/2025	12/5/2025	924008764	Kyle	Freudenberger	(blank)	kyfreudenberger@gmail.com	5872252039	787.47	KEEP															
																									
																									
																									
Quarter 1 (2026)																									
Store Credit Aging	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS			Approved by (Full Name)													
Over 30 Days	5/16/2024	904029437	Raymond	mcguines	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP																	
Over 30 Days	10/14/2025	4036379	Ron	Kellam	RGKELLAM@HUGHES.NET	4032575454	524.99	KEEP																	
Over 30 Days	12/11/2025	918013758	Lea	Lopez	(blank)	2048912795	2,099.99	KEEP																	
Over 30 Days	1/12/2026	904041515	JJ	Williams	(blank)	4038036636	1,799.95	PROCESSED																	
Over 30 Days	2/7/2026	904032605	Dallas	Touchette	dallastouchette1010@gmail.com	4039736158	276.28	KEEP																	
Over 30 Days	2/7/2026	937022120	Dillon	Meier	(blank)	4039886736	233.14	KEEP																	
Over 30 Days	2/7/2026	504000249	Larry	Smith	larry13@telus.net	4032814413	183.12	KEEP																	
Over 30 Days	2/7/2026	4045894	Dave	Giles	DAVEGILES1974@GMAIL.COM	4033338426	198.24	KEEP																	
Over 30 Days	2/7/2026	4061522	Calvin	Metcalf	calvin_metcalf@hotmail.com	5878300154	233.14	KEEP																	
Over 30 Days	2/7/2026	27683600	JEFF	Macdonald	JEFF@SUREFIREINDUSTRIES.CA	4032009869	212.39	KEEP 																	
Over 30 Days	2/7/2026	37122374	MIKE	POLITESKI	(blank)	4038180356	84.63	KEEP																	
Over 30 Days	2/11/2026	904041710	Marty	Kluck	klukmak@shaw.ca	(blank)	248.85	KEEP																	
Over 30 Days	2/11/2026	927012717	Fred	KWAN	(blank)	4039236899	661.43	PROCESSED																	
Over 30 Days	2/13/2026	904027036	Rees	matzner	reesmatzner@gmail.com	4039997292	5.49	REMOVE																	
Over 30 Days	2/21/2026	41013488	Reid	Nesbitt	reid_85@telus.net	4033701250	292.5	KEEP 																	
Over 30 Days	2/27/2026	504004602	aaron	Lawrick	air_law@hotmail.com	5872242886	1,547.27	KEEP 																	
Over 30 Days	2/27/2026	924008764	Kyle	Freudenberger	kyfreudenberger@gmail.com	5872252039	524.98	KEEP																	
Over 30 Days	3/2/2026	888580122	Rick	Woo	rycwoo@shaw.ca	4038154093	197.94	KEEP																	
Over 30 Days	3/5/2026	904004465	BRIAN	ziegler	(blank)	4038071152	346.49	KEEP																	
Over 30 Days	3/11/2026	945025469	pamela	mang	(blank)	4038708998	140.16	KEEP																	
Over 30 Days	3/11/2026	904037160	sam	jack	(blank)	4037712327	31.5	KEEP																	
Over 30 Days	3/11/2026	37119613	DANNY	FACH	DANNY.FACH@LIVE.COM	4036804824	545.99	KEEP																	
Over 30 Days	3/12/2026	927021614	Chris	Collins	chrisbobcollins@gmail.com	4038695160	2,047.49	KEEP 																	
Over 30 Days	3/13/2026	937024975	Joe	Healy	(blank)	4036349119	262.5	KEEP																	
Over 30 Days	3/13/2026	504009237	Bradley 	Bernardo	bernadobj@gmail.com	4036905748	562.79	KEEP																	
Over 30 Days	3/14/2026	904036197	Adam	TAYLOR	(blank)	5878970070	472.49	KEEP																	
Over 30 Days	3/14/2026	904041942	Alistair	robin	(blank)	4038306866	1,259.98	KEEP																	
Over 30 Days	3/14/2026	527006546	James	Pelzer	pelzer4@hotmail.com	4037970674	521.84	KEEP																	
Over 30 Days	3/14/2026	41015024	Kyle	Key	KKEY@SHAW.CA	4033072751	564.89	KEEP																	
Over 30 Days	3/14/2026	936001146	Chandler	Bruyckere	(blank)	2502402057	810.6	PROCESSED																	
Over 30 Days	3/15/2026	27694527	Brad	WATSON	BRADWATSON865@GMAIL.COM	4038037140	173.25	KEEP 																	
																									
																									
Quarter 2 (2026)																									
Store Credit Aging	LAST_SALE_DATE	CUST_ID	FIRST_NAME	LAST_NAME	EMAIL	PHONE	Sum of Store Credit Balance	KEEP or REMOVE	COMMENTS																
Over 30 Days	2/7/2026	937022120	Dillon	Meier	(blank)	4039886736	233.14	KEEP																	
Over 30 Days	2/7/2026	27683600	Jeff	MacDonald	JEFF@SUREFIREINDUSTRIES.CA	4032009869	212.39	KEEP																	
Over 30 Days	2/7/2026	37122374	Mike	POLITESKI	(blank)	4038180356	84.63	KEEP																	
Over 30 Days	2/11/2026	904041710	Marty	Kluck	klukmak@shaw.ca	(blank)	248.85	KEEP																	
Over 30 Days	3/20/2026	904032605	Dallas	Touchette	dallastouchette1010@gmail.com	4039736158	276.28	KEEP																	
Over 30 Days	4/3/2026	4045894	dave	Giles	DAVEGILES1974@GMAIL.COM	4033338426	198.24	KEEP																	
Over 30 Days	4/19/2026	37114212	Rick	Mazurkewich	RICK.MAZURKEWICH@GMAIL.COM	5879987202	251.99	KEEP																	
Over 30 Days	5/12/2026	904042544	dave 	sutherland 	(blank)	4037718301	40	REMOVE																	
Over 30 Days	5/19/2026	27690836	Kevin	FRENCH	KEVINFRENCH22@HOTMAIL.COM	4036068593	157.5	PROCESSED																	
Over 30 Days	5/22/2026	999100091	Corporate	Account	(blank)	4509260110	287.44	KEEP 																	
Over 30 Days	5/23/2026	904042163	Josh	Logel	joshlogel@gmail.com	4038161417	732.89	KEEP																	
Over 30 Days	5/23/2026	904043170	Brad	hunter	(blank)	4036049062	115.48	PROCESSED																	
Over 30 Days	5/27/2026	904007496	Ross	Bentley	(blank)	4035128895	1,679.99	PROCESSED																	
Over 30 Days	5/29/2026	953007983	Bob	Leaf	(blank)	5877849098	713.99	PROCESSED																	
Over 30 Days	5/30/2026	41013488	Reid	Nesbitt	reid_85@telus.net	4033701250	292.5	KEEP																	
Over 30 Days	5/30/2026	904033349	Zeke	Parreno	(blank)	5875862800	20	KEEP																	
Over 30 Days	6/2/2026	29673299	Lloyd	gauthier	gauthier@gmail.com	2508886136	87.23	KEEP 																	
Over 30 Days	6/4/2026	904005725	Marylynn	Breitman	(blank)	4039995349	62.98	PROCESSED																	
Over 30 Days	6/5/2026	904014127	Tom	Brummelhuis	(blank)	4034220157	188.99	PROCESSED																	
Over 30 Days	6/8/2026	904007960	greg	Lefbvre	(blank)	4036066068	818.97	KEEP																	
Over 30 Days	6/10/2026	4061522	Calvin	Metcalf	calvin_metcalf@hotmail.com	5878300154	233.14	KEEP 																	
Over 30 Days	6/10/2026	924008764	Kyle	Freudenberger	kyfreudenberger@gmail.com	5872252039	524.98	KEEP																	
Over 30 Days	6/11/2026	904043361	Alex	elichlietner	(blank)	4038086468	1,559.96	PROCESSED																	
Over 30 Days	6/18/2026	504000249	Larry	Smith	larry13@telus.net	4032814413	183.12	KEEP																	
Over 30 Days	6/25/2025	904029437	raymond	mcguines	raymondmcguineswb@gmail.com	5878999094	251.99	KEEP 																	
Over 30 Days	7/2/2026	37113331	James	Schroeder	SCHROEDERJ@TELUSBLACKBERRY.NET	4036517227	2,204.99	PROCESSED																	
Over 30 Days	7/11/2026	4039172	Ian	Stroet	GOLF_GOD13@HOTMAIL.COM	4039219568	118.65	KEEP																	
Over 30 Days	8/6/2025	906025769	Jugaansan 	Thayalan	(blank)	6473393927	140.11	KEEP 																	
Over 30 Days	10/14/2025	4036379	Ron	Kellam	RGKELLAM@HUGHES.NET	4032575454	524.99	KEEP 																	
Over 30 Days	12/16/2025	918013758	Lea	Lopez	(blank)	2048912795	2,099.99	KEEP 																	`;

export function parseStore504Data(): CustomerRecord[] {
  const lines = STORE_504_RAW_TEXT.split('\n');
  const records: CustomerRecord[] = [];

  let currentQuarter = 'Q1';
  let currentYear = 2021;
  let currentQuarterYearKey = '2021-Q1';

  let colMap: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.includes('(OLDER PERIODS HIDDEN)')) continue;

    // Detect quarter section headers e.g. "Quarter 1", "Quarter 1 (2022)"
    const quarterMatch = rawLine.match(/Quarter\s*(\d)\s*\(?(\d{4})?\)?/i);
    if (quarterMatch) {
      currentQuarter = `Q${quarterMatch[1]}`;
      if (quarterMatch[2]) {
        currentYear = parseInt(quarterMatch[2], 10);
      } else {
        currentYear = 2021;
      }
      currentQuarterYearKey = `${currentYear}-${currentQuarter}`;
      colMap = {}; // Reset column map for new quarter section
      continue;
    }

    const cols = rawLine.split('\t').map(c => c.trim());
    const parsed = parseRowWithSmartAlignment(cols, colMap, 'Calgary');

    if (parsed.isHeader && parsed.newColIndexes) {
      colMap = parsed.newColIndexes;
      continue;
    }

    if (!parsed.parsedFields) continue;

    const {
      rawCustId,
      firstName,
      lastName,
      company,
      email,
      phone,
      city,
      balanceNum,
      comments,
      keepOrRemove,
      createdDate,
      saleDate,
      aging
    } = parsed.parsedFields;

    if (!firstName && !lastName && !rawCustId) continue;

    const guessed = guessGender(firstName);

    records.push({
      id: `504-${currentQuarterYearKey}-${records.length + 1}-${Math.random().toString(36).substr(2, 4)}`,
      storeId: '504',
      storeName: 'Store 504 - South Calgary Golf Town',
      quarter: currentQuarter,
      year: currentYear,
      quarterYearKey: currentQuarterYearKey,
      city: city || 'Calgary',
      storeCreditAging: aging || 'Over 30 Days',
      lastCreatedDate: createdDate,
      lastSaleDate: saleDate,
      custId: rawCustId,
      firstName,
      lastName,
      company: company || '',
      email: email || '',
      phone: phone || '(403) 723-0100',
      sumOfStoreCreditBalance: balanceNum,
      keepOrRemove: keepOrRemove || 'keep',
      comments: comments || '',
      approvedBy: '',
      gender: guessed.gender,
      genderConfidence: guessed.confidence
    });
  }

  return sanitizeCustomerRecords(records);
}

export const STORE_504_CUSTOMERS = parseStore504Data();
