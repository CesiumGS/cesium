	// setup the database named query
	dbStatements = new HashMap<String, String>();
	dbStatements.put("getCreditDefaultSwapsByEntityName",
		"select xmldocument( " +
			"xmlquery(" +
				"'declare default element namespace \"http://www.fpml.org/2009/FpML-4-7\"; " + 
				"$DOCUMENT/FpML/trade/creditDefaultSwap' ) " +
			" ) " +
			"from fpmladmin.fpml43 where comment like ? and " +
				"xmlexists(" +
					"'declare default element namespace \"http://www.fpml.org/2009/FpML-4-7\"; " +
					"$fpml/FpML/trade/creditDefaultSwap/generalTerms/referenceInformation/referenceEntity[entityName=$name]' " +
					"passing document as \"fpml\", " +
					"cast (? as varchar(100)) as \"name\")"
	);
	...
	// create the executable and execute it with the JDBC resolver and entityName variable
	Source source = new Source(FpMLServlet.class.getResource("/joinCreditDefaultSwap.xq").toString());
	XQueryExecutable joinCreditDefaultSwapsXQ = factory.prepareXQuery(source, staticContext);
	...
	JDBCCollectionResolver inputResolver = new JDBCCollectionResolver(getConnection(), dbStatements);
	dynamicContext.setCollectionResolver(inputResolver);
	StreamSource source = new StreamSource(FpMLServlet.class.getResourceAsStream("/assets.xml"));
	dynamicContext.bind(new QName("http://com.ibm.xml.samples", "entityName"), name);
	XSequenceCursor output = joinCreditDefaultSwapsXQ.execute(source, dynamicContext);