<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:saxon="http://saxon.sf.net/" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" extension-element-prefixes="saxon" version="2.0">
<xsl:import href="util.xsl"/>
<xsl:output method="text" indent="yes" saxon:byte-order-mark="yes"/>
<!-- list the data elements whose spaces should be preserved
   it seems listing only the parent node doesn't work -->
    <xsl:preserve-space elements="month day quarter dayPeriod era pattern dateFormatItem appendItem displayName"/>
<xsl:strip-space elements="*"/> 
<xsl:variable name="index" select="number(1)" saxon:assignable="yes"/>

<xsl:template match="/">
     <xsl:apply-templates/>
</xsl:template>

<!-- process ldml,dates,calendars-->
<xsl:template name="top" match="/ldml">
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">top</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
                </xsl:call-template>  
                </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
            <xsl:choose>
                <xsl:when test="name()='calendars'">
                    <!-- calendars -->
                    <xsl:for-each select="calendar">
                        <saxon:assign name="first" select="true()"/>
                        <xsl:result-document href="{concat(@type,'.js')}" encoding="UTF-8"><!--<xsl:value-of select="codepoints-to-string(65279)"/>-->// generated from ldml/main/*.xml, xpath: ldml/calendars/calendar-<xsl:value-of select="./@type"/>
({<xsl:call-template name="calendar"></xsl:call-template>
})
                        </xsl:result-document>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>                    
                    <xsl:if test="name()='ldml'">
                        <!-- ldml -->
                        <xsl:for-each select="dates">
                            <xsl:call-template name="top"></xsl:call-template>
                        </xsl:for-each>
                    </xsl:if>
                    <xsl:if test="name()='dates'">
                        <!-- dates -->
                        <xsl:for-each select="calendars">
                            <xsl:call-template name="top"></xsl:call-template>
                        </xsl:for-each>
                    </xsl:if>                 
                </xsl:otherwise>
            </xsl:choose>
         </xsl:otherwise>
    </xsl:choose>        
</xsl:template>

    <!-- process calendar-->
<xsl:template name="calendar" match="calendar">
    <!-- will be overridden with 'true' if from 'locale' alias, see 'invoke_template_by_name' -->   
    <xsl:param name="fromLocaleAlias" select="false()"/>

    <!-- insert 'locale' alias information  start -->
    <xsl:if test="$fromLocaleAlias">
        <xsl:call-template name="insert_alias_info">
			<xsl:with-param name="sourceName">*</xsl:with-param>
            <xsl:with-param name="bundle" select="@type"/>
        </xsl:call-template>
    </xsl:if>
    <!-- insert 'locale' alias information  start -->
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">calendar</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
                </xsl:call-template>     
            </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
            <xsl:apply-templates/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<!-- process months | days | quarters | dayPeriods -->
    <xsl:template name="months_days_quarters_dayPeriods" match="months | days | quarters | dayPeriods">
    <xsl:param name="name" select="name()"/>
    <xsl:param name="width" select="@type"/>
    <xsl:param name="ctx" select="../@type"/>
     <!-- will be overridden with 'true' if from 'locale' alias, see 'invoke_template_by_name' -->   
     <xsl:param name="fromLocaleAlias" select="false()"/>

	<xsl:variable name="item" select="substring-before(name(), 'Width')"/>
	<!-- insert 'locale' alias information start -->
    <xsl:if test="$fromLocaleAlias">
        <xsl:if test="name()='months' or name()='days' or name()='quarters' or name()='dayPeriods'">
                <xsl:call-template name="insert_alias_info"/>
         </xsl:if>
        <xsl:if test="name()='monthWidth' or name()='dayWidth' or name()='quarterWidth' or name()='dayPeriodWidth'">
            <!-- e.g.  for <monthContext type="format">
        		<monthWidth type="abbreviated">
        			<alias source="locale" path="../monthWidth[@type='wide']"/>
        		</monthWidth> 
                          ......                   
	            alias info will be recorded as 'months-format-abbr@localeAlias' : {'target' : "months-format-wide"}                        
	            TBD: Seems the following section cann't be extracted out as a reusable template       
	            insert 'locale' alias information end -->
	            <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="$item"/><xsl:text>s-</xsl:text>
	            <xsl:call-template name="camel_case">
	                <xsl:with-param name="name"><xsl:value-of select="$ctx"></xsl:value-of></xsl:with-param>
	            </xsl:call-template>
	            <xsl:choose>
	                <xsl:when test="$width='abbreviated'"><xsl:text>-abbr</xsl:text></xsl:when>
	                <xsl:otherwise><xsl:value-of select="concat('-',$width)"></xsl:value-of></xsl:otherwise>
	            </xsl:choose>
	            <xsl:text>@localeAlias</xsl:text>
				<xsl:value-of select="$index"/><saxon:assign name="index" select="sum($index + 1)"/>
				<xsl:text>':{'target':"</xsl:text><xsl:value-of select="$item"/><xsl:text>s-</xsl:text>
	            <xsl:call-template name="camel_case">
	                <xsl:with-param name="name"><xsl:value-of select="../@type"/></xsl:with-param>
	            </xsl:call-template>
	            <xsl:choose>
	                <xsl:when test="@type='abbreviated'"><xsl:text>-abbr</xsl:text></xsl:when>
	                <xsl:otherwise><xsl:value-of select="concat('-',@type)"/></xsl:otherwise>
	            </xsl:choose> 
	            <xsl:text>",'bundle':"</xsl:text><xsl:value-of select="../../../@type"/><xsl:text>"}</xsl:text>
		</xsl:if>  
    </xsl:if>
	<!-- insert 'locale' alias information end -->       
	 
    <xsl:choose>       
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">months_days_quarters_dayPeriods</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
                    <xsl:with-param name="name" select="$name"></xsl:with-param>
					<xsl:with-param name="width" select="$width"></xsl:with-param>
                    <xsl:with-param name="ctx" select="$ctx"></xsl:with-param>
                </xsl:call-template>
            </xsl:for-each>            
        </xsl:when>
        <xsl:otherwise>
            <xsl:if test="name()='months' or name()='monthContext' or name()='days' or name()='dayContext'
                or name()='quarters' or name()='quarterContext' or name()='dayPeriods' or name()='dayPeriodContext'">
                <xsl:for-each select="*">
                    <xsl:call-template name="months_days_quarters_dayPeriods"></xsl:call-template>
                </xsl:for-each>
            </xsl:if>
            <xsl:if test="name()='monthWidth' or name()='dayWidth' or name()='quarterWidth' or name()='dayPeriodWidth' ">
                <!--xsl:variable name="item" select="substring-before(name(), 'Width')"/-->
                <xsl:if test="count(*[not(@draft)])>0 or count(*[@draft!='provisional' and @draft!='unconfirmed'])>0">
					<xsl:choose>
						<!-- special format for dayPeriodWidth e.g.'dayPeriods-am-format-wide':"AM"-->
						<xsl:when test="name()='dayPeriodWidth'">
					        <xsl:call-template name="apm">
				                <xsl:with-param name="item" select="$item"></xsl:with-param>
								<xsl:with-param name="width" select="$width"></xsl:with-param>
								<xsl:with-param name="ctx" select="$ctx"></xsl:with-param>
					        </xsl:call-template>				
						</xsl:when>
						<!--monthWidth, dayWidth and quarterWidth-->
						<xsl:otherwise>					
			                <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="$item"/>
			                <xsl:text>s-</xsl:text>
			                <xsl:call-template name="camel_case">
			                    <xsl:with-param name="name"><xsl:value-of select="$ctx"></xsl:value-of></xsl:with-param>
			                </xsl:call-template>
			                <xsl:choose>
			                	<xsl:when test="$width='abbreviated'"><xsl:text>-abbr</xsl:text></xsl:when>
			                	<xsl:otherwise>
			                       <xsl:value-of select="concat('-',$width)"></xsl:value-of>
			                    </xsl:otherwise>
			                </xsl:choose>
			                <xsl:text>':</xsl:text>
			                <!--xsl:call-template name="subSelect"><xsl:with-param name="name" select="./*[name()=$item]"></xsl:with-param></xsl:call-template-->
			                <xsl:call-template name="subSelect_in_place"><xsl:with-param name="name" select="$item"></xsl:with-param></xsl:call-template>
							<!-- for leap month -->
							<xsl:for-each select="*[@yeartype='leap']">
	    						<xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="$item"/><xsl:text>s-</xsl:text>
	    						<xsl:call-template name="camel_case">
							        <xsl:with-param name="name"><xsl:value-of select="$ctx"></xsl:value-of></xsl:with-param>
							    </xsl:call-template>
							    <xsl:choose>
							    	<xsl:when test="$width='abbreviated'"><xsl:text>-abbr</xsl:text></xsl:when>
							    	<xsl:otherwise>
							           <xsl:value-of select="concat('-',$width)"></xsl:value-of>
							        </xsl:otherwise>
							    </xsl:choose>
								<xsl:text>-</xsl:text><xsl:value-of select="@yeartype"/><xsl:text>':"</xsl:text>
							    <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/><xsl:text>"</xsl:text>
							</xsl:for-each>						
						</xsl:otherwise>
					</xsl:choose>
                </xsl:if>               
         	</xsl:if>
         </xsl:otherwise>
    </xsl:choose>
</xsl:template>
  
    <!-- template for inserting 'locale' alias information, 
           e.g. for     <calendar type="buddhist">
                                <months>
                                    <alias source="locale" path="../../calendar[@type='gregorian']/months"/>
                                </months>
                                      ......
         alias info will be recorded as 'months@localeAlias' : {'target':"months", 'bundle' : 'gregorian'}    -->
    <xsl:template name="insert_alias_info">
        <!-- alias source node name-->
        <xsl:param name="sourceName" select="name()"></xsl:param>
        <!-- alias target node name, same as source node by default-->
        <xsl:param name="targetName" select="$sourceName"></xsl:param>
        <!-- alias target bundle-->
        <xsl:param name="bundle" select="../@type"></xsl:param>
        <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="$sourceName"/><xsl:text>@localeAlias</xsl:text>
		<xsl:value-of select="$index"/><saxon:assign name="index" select="sum($index + 1)"/>
		<xsl:text>':{'target':"</xsl:text><xsl:value-of select="$targetName"/><xsl:text>", 'bundle':"</xsl:text>
        <xsl:value-of select="$bundle"/><xsl:text>"}</xsl:text>
    </xsl:template>
    
	
<!--process am & noon & pm for <dayPeriod> -->
<xsl:template name="apm">
	<xsl:param name="item"></xsl:param>
	<xsl:param name="ctx"></xsl:param>
	<xsl:param name="width"></xsl:param>
	
    <xsl:for-each select="*[not(@alt) and (not(@draft) or @draft!='provisional' and @draft!='unconfirmed')]">
	    <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="$item"/><xsl:text>s-</xsl:text>
	    <xsl:call-template name="camel_case">
	        <xsl:with-param name="name"><xsl:value-of select="$ctx"></xsl:value-of></xsl:with-param>
	    </xsl:call-template>
	    <xsl:choose>
	    	<xsl:when test="$width='abbreviated'"><xsl:text>-abbr</xsl:text></xsl:when>
	    	<xsl:otherwise>
	           <xsl:value-of select="concat('-',$width)"></xsl:value-of>
	        </xsl:otherwise>
	    </xsl:choose>
	    <xsl:text>-</xsl:text><xsl:value-of select="@type"/><xsl:text>':"</xsl:text>
	    <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/><xsl:text>"</xsl:text>
    </xsl:for-each>
 </xsl:template>


<!-- process eras -->
<xsl:template match="eras" name="eras">
	<xsl:param name="name" select="name()"></xsl:param>
    <!-- will be overridden with 'true' if from alias, see 'invoke_template_by_name' -->   
    <xsl:param name="fromLocaleAlias" select="false()"/>
			
   <!-- insert 'locale' alias information start -->
   <xsl:if test="$fromLocaleAlias">
		<xsl:choose>
			<xsl:when test="name()='eras'">
		        <xsl:call-template name="insert_alias_info">
		                <xsl:with-param name="sourceName">era</xsl:with-param>
		        </xsl:call-template>				
			</xsl:when>
			<xsl:otherwise>
		        <xsl:call-template name="insert_alias_info">
		            <xsl:with-param name="sourceName" select="$name"></xsl:with-param>
		            <xsl:with-param name="targetName" select="name()"></xsl:with-param>
		            <xsl:with-param name="bundle" select="../../@type"></xsl:with-param>
		        </xsl:call-template>
			</xsl:otherwise>
		</xsl:choose>	
    </xsl:if>
    <!-- insert 'locale' alias information end -->

	<xsl:choose>
		<xsl:when test="count(./alias)>0">
			<!-- Handle Alias -->  
			<xsl:for-each select="./alias">
				<xsl:call-template name="alias_template">
					<xsl:with-param name="templateToCall">eras</xsl:with-param>
					<xsl:with-param name="source" select="@source"></xsl:with-param>
					<xsl:with-param name="xpath" select="@path"></xsl:with-param>
					<xsl:with-param name="name" select="$name"></xsl:with-param>
				</xsl:call-template>
			</xsl:for-each>	   
		</xsl:when>
		<xsl:otherwise>
			<xsl:choose>
				<xsl:when test="name()='eras'">
					<xsl:for-each select="*">
						<xsl:call-template name="eras"></xsl:call-template>
					</xsl:for-each>
				</xsl:when>
				<xsl:otherwise>
					<xsl:for-each select=".">
					    <xsl:if test="count(*[not(@draft)])>0 
					        or count(*[@draft!='provisional' and @draft!='unconfirmed'])>0">
					        <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="$name"></xsl:value-of>
						<xsl:text>':</xsl:text>
					           <xsl:choose>
					               <xsl:when test="name()='eraNarrow'">
					                   <!-- only one special case for eraNarrow in root.xml - japanese
					                         index starts from 232,not 0-->
					                   <xsl:call-template name="subSelect">
					                       <xsl:with-param name="name" select="era"></xsl:with-param>
					                   </xsl:call-template>
					               </xsl:when>
					               <xsl:otherwise>
					                   <xsl:call-template name="subSelect_in_place">
					                       <xsl:with-param name="name" select="'era'"></xsl:with-param>
					                   </xsl:call-template>
					               </xsl:otherwise>
					           </xsl:choose>
					        </xsl:if>
					</xsl:for-each>
				</xsl:otherwise>
				</xsl:choose>	  
		</xsl:otherwise>
	</xsl:choose>
</xsl:template>


<!-- process dateFormat & timeFormat -->   
 <xsl:template match="dateFormats | timeFormats" name="date_time_Formats">
     <xsl:param name="width" select="@type"></xsl:param>
     <!-- will be overridden with 'true' if from alias, see 'invoke_template_by_name' -->   
     <xsl:param name="fromLocaleAlias" select="false()"/>
	 
   <!-- insert 'locale' alias information start -->
   <xsl:if test="$fromLocaleAlias">
		<xsl:if test="name()='dateFormats' or name()='timeFormats'">
             <xsl:call-template name="insert_alias_info">
                 <xsl:with-param name="sourceName" select="substring-before(name(), 's')"/>
             </xsl:call-template>
		</xsl:if>
        <xsl:if test="name()!='default' and (name()='dateFormatLength' or name()='timeFormatLength')">
             <xsl:call-template name="insert_alias_info">
                 <xsl:with-param name="sourceName" select="concat(substring-before(name(), 'Length'), '-',  $width)"/>
                 <xsl:with-param name="targetName" select="concat(substring-before(name(), 'Length'), '-',  @type)"/>
                 <xsl:with-param name="bundle" select="../../@type"/>
             </xsl:call-template>
         </xsl:if>
    </xsl:if>
    <!-- insert 'locale' alias information end -->
	 
     <xsl:choose>
         <xsl:when test="count(./alias)>0">
             <!-- Handle Alias -->  
             <xsl:for-each select="./alias">
                 <xsl:call-template name="alias_template">
                     <xsl:with-param name="templateToCall">date_time_Formats</xsl:with-param>
                     <xsl:with-param name="source" select="@source"></xsl:with-param>
                     <xsl:with-param name="xpath" select="@path"></xsl:with-param>
					 <xsl:with-param name="width" select="$width"></xsl:with-param>
                 </xsl:call-template>
             </xsl:for-each>       
         </xsl:when>
         <xsl:otherwise>
             <xsl:choose>
                 <xsl:when test="name()='dateFormats' or name()='timeFormats'">
                     <xsl:for-each select="*">
                         <xsl:call-template name="date_time_Formats"></xsl:call-template>
                     </xsl:for-each>
                 </xsl:when>
                 <xsl:otherwise>
                     <xsl:if test="name()!='default'">
                         <xsl:for-each select=".//pattern[not(@draft)] | 
                          .//pattern[@draft!='provisional' and @draft!='unconfirmed']">
                             <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="name(..)"></xsl:value-of>
                         <xsl:text>-</xsl:text>
                         <xsl:value-of select='$width'/>': "<xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/>
                         <xsl:text>"</xsl:text>
                     </xsl:for-each>
                     </xsl:if>
                 </xsl:otherwise>
             </xsl:choose>
                </xsl:otherwise>
     </xsl:choose>
</xsl:template>
 
<!-- process dateTimeFormat -->
<xsl:template name="dateTimeFormats" match="dateTimeFormats">
    <xsl:param name="width" select="@type"></xsl:param>
    <!-- will be overridden with 'true' if from alias, see 'invoke_template_by_name' -->   
    <xsl:param name="fromLocaleAlias" select="false()"/>

   <!-- insert 'locale' alias information start -->
   <xsl:if test="$fromLocaleAlias">
			<xsl:if test="name()='dateTimeFormats'">
                <xsl:call-template name="insert_alias_info">
                    <xsl:with-param name="sourceName">dateTime</xsl:with-param>
                </xsl:call-template>
			</xsl:if>
            <xsl:if test="name()='dateTimeFormatLength'">
                <xsl:call-template name="insert_alias_info">
                    <xsl:with-param name="sourceName">dateTimeFormat</xsl:with-param>
                    <xsl:with-param name="bundle" select="../../@type"/>
                </xsl:call-template>
            </xsl:if>
            <xsl:if test="name()='availableFormats'">
                 <xsl:call-template name="insert_alias_info">
                     <xsl:with-param name="sourceName">dateTimeAvailableFormats</xsl:with-param>
                     <xsl:with-param name="bundle" select="../../@type"/>
                 </xsl:call-template>
            </xsl:if>
            <xsl:if test="name()='appendItems'">
                <xsl:call-template name="insert_alias_info">
                    <xsl:with-param name="sourceName">dateTimeFormats-appendItem-</xsl:with-param>
                    <xsl:with-param name="bundle" select="../../@type"/>
                </xsl:call-template>
            </xsl:if>
    </xsl:if>
	<!-- insert 'locale' alias information start -->
	
    <xsl:choose>
    <xsl:when test="./alias">
        <!-- Handle Alias -->
        <xsl:for-each select="./alias">
            <xsl:call-template name="alias_template">
                <xsl:with-param name="templateToCall">dateTimeFormats</xsl:with-param>
                <xsl:with-param name="source" select="@source"></xsl:with-param>
                <xsl:with-param name="xpath" select="@path"></xsl:with-param>
				<xsl:with-param name="width" select="$width"></xsl:with-param>
            </xsl:call-template>
        </xsl:for-each>
    </xsl:when>
    <xsl:otherwise>
       <xsl:choose>
            <xsl:when test="name()='dateTimeFormats'">
                <xsl:for-each select="*">
                    <xsl:call-template name="dateTimeFormats"></xsl:call-template>
                </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
        <xsl:if test="name()!='default'">
        <!-- patterns -->
        <xsl:if test="name()='dateTimeFormatLength'">
            <xsl:for-each select=".//pattern[not(@draft)] | 
                .//pattern[@draft!='provisional' and @draft!='unconfirmed']">
                <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="name(..)"></xsl:value-of>
             <xsl:if test="string-length($width) > 0">
             	<xsl:text>-</xsl:text>
                          <xsl:value-of select='$width'/>
              </xsl:if>
               <xsl:text>': "</xsl:text>
               <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/><xsl:text>" </xsl:text>          
            </xsl:for-each>
         </xsl:if>
        <!-- availableFormats -->
            <xsl:if test="name()='availableFormats'">
                <xsl:for-each select=".//dateFormatItem[not(@draft)] | 
                    .//dateFormatItem[@draft!='provisional' and @draft!='unconfirmed']">
                    <xsl:call-template name="insert_comma"/>
	'dateFormatItem-<xsl:value-of select="@id"></xsl:value-of>
                <xsl:text>':"</xsl:text>
                <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"></xsl:value-of>
                <xsl:text>"</xsl:text>
                </xsl:for-each>
            </xsl:if>
        <!-- appendItems -->
            <xsl:if test="name()='appendItems'">
                <xsl:for-each select=".//appendItem[not(@draft)] | 
                    .//appendItem[@draft!='provisional' and @draft!='unconfirmed']">
                    <xsl:call-template name="insert_comma"/>
	'dateTimeFormats-appendItem-<xsl:value-of select="@request"></xsl:value-of>
                <xsl:text>':"</xsl:text>
                <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"></xsl:value-of>
                <xsl:text>"</xsl:text>
                </xsl:for-each>
            </xsl:if>
     </xsl:if>
    </xsl:otherwise>
    </xsl:choose>
    </xsl:otherwise>
    </xsl:choose>
</xsl:template>
    
 <!-- process fields-->
<xsl:template name="fields" match="fields">
    <xsl:param name="width" select="@type"></xsl:param>
    <!-- will be overridden with 'true' if from alias, see 'invoke_template_by_name' -->   
    <xsl:param name="fromLocaleAlias" select="false()"/>

   <!-- insert 'locale' alias information start -->
   <xsl:if test="$fromLocaleAlias">
		<xsl:if test="name()='fields'">
            <xsl:call-template name="insert_alias_info">
                <xsl:with-param name="sourceName">field</xsl:with-param>
            </xsl:call-template>				
		</xsl:if>
        <xsl:if test="name() = 'field'">
            <xsl:call-template name="insert_alias_info">
                <xsl:with-param name="sourceName" select="concat(name(), '-', $width)"/>
                <xsl:with-param name="targetName" select="concat(name(), '-', @type)"/>
                <xsl:with-param name="bundle" select="../../@type"/>
            </xsl:call-template>
        </xsl:if>
    </xsl:if>
    <!-- insert 'locale' alias information end -->	
	
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">fields</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
					<xsl:with-param name="width" select="$width"></xsl:with-param>
                </xsl:call-template>
            </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
            <xsl:choose>
                <xsl:when test="name()='fields'">
                    <xsl:for-each select="*">
                        <xsl:call-template name="fields"></xsl:call-template>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:for-each select=".//displayName[not(@draft)] | 
                        .//displayName[@draft!='provisional' and @draft!='unconfirmed']">
                        <xsl:call-template name="insert_comma"/>
	'field-<xsl:value-of select="$width"></xsl:value-of>
                        <xsl:text>':"</xsl:text>
                        <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/>
                        <xsl:text>"</xsl:text>
                    </xsl:for-each>                    
                    <xsl:for-each select=".//relative">
                        <xsl:call-template name="insert_comma"/>
	'field-<xsl:value-of select="$width"></xsl:value-of>
                        <xsl:text>-relative+</xsl:text>
                        <xsl:value-of select="@type"/>
                        <xsl:text>':"</xsl:text>
                        <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/>
                        <xsl:text>"</xsl:text>
                    </xsl:for-each>                    
                </xsl:otherwise>
            </xsl:choose> 
         </xsl:otherwise>
    </xsl:choose>    
</xsl:template>

<!-- Sub output routine-->
<xsl:template name="subSelect">
    <xsl:param name="name"></xsl:param>
    <xsl:variable name="num" select="count(./$name[not(@draft)])+count(./$name[@draft!='provisional' and @draft!='unconfirmed'])"></xsl:variable>
    <xsl:if test="$num>1">
        <xsl:text>[</xsl:text>
        <xsl:for-each select="$name[not(@draft)] | $name[@draft!='provisional' and @draft!='unconfirmed']">
            <xsl:text>"</xsl:text>
            <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/>
            <xsl:text>"</xsl:text>
            <xsl:if test="$num>position()">
                <xsl:text>,</xsl:text>
            </xsl:if>            
        </xsl:for-each>
        <xsl:text>]</xsl:text>
    </xsl:if>
    <xsl:if test="$num=1">
        <xsl:text>"</xsl:text><xsl:value-of select="replace($name[not(@draft)] 
            | $name[@draft!='provisional' and @draft!='unconfirmed'],'&quot;', '\\&quot;')"/><xsl:text>"</xsl:text>
    </xsl:if>
</xsl:template>
    
    
 <!-- Special sub output routine, only for month, day,quarter,and era, each none
	"provisional/unconfirmed" draft item should be output in its corresponding place
	(according to its @type)

	e.g. <month type="5">5</month> should be in the 5th position in the output array,
	undefined is stuffed for preceding elements-->

<xsl:variable name="last_sibling_type" select="-1" saxon:assignable="yes"/>
<xsl:variable name="type_value" select="-1" saxon:assignable="yes"/>
<xsl:variable name="num_expect_preceding_sibling" select="-1" saxon:assignable="yes"/>
    
<xsl:template name="subSelect_in_place">
    <xsl:param name="name"></xsl:param>
    <!--xsl:variable name="num" select="count(./$name[not(@draft)])+count(./$name[@draft!='provisional' and @draft!='unconfirmed'])"></xsl:variable-->
    <xsl:variable name="num" select="count(./*[name()=$name and (not(@draft) or @draft!='provisional' and @draft!='unconfirmed') and not(@yeartype)])"></xsl:variable>
    <xsl:text>[</xsl:text>
    <!--xsl:for-each select="$name[not(@draft)] | $name[@draft!='provisional' and @draft!='unconfirmed']"-->
    <xsl:for-each select="./*[name()=$name and (not(@draft) or @draft!='provisional' and @draft!='unconfirmed') and not(@yeartype)]">        
        <xsl:choose>
            <xsl:when test="$name='day'">
                <!--TODO: too bad that assign name can not be variable -->
                <xsl:if test="@type='sun'"><saxon:assign name="type_value" select="1"/> </xsl:if>
                <xsl:if test="@type='mon'"><saxon:assign name="type_value" select="2"/> </xsl:if>
                <xsl:if test="@type='tue'"><saxon:assign name="type_value" select="3"/> </xsl:if>
                <xsl:if test="@type='wed'"><saxon:assign name="type_value" select="4"/> </xsl:if>
                <xsl:if test="@type='thu'"><saxon:assign name="type_value" select="5"/> </xsl:if>
                <xsl:if test="@type='fri'"><saxon:assign name="type_value" select="6"/> </xsl:if>
                <xsl:if test="@type='sat'"><saxon:assign name="type_value" select="7"/> </xsl:if>
            </xsl:when>
            <xsl:otherwise><saxon:assign name="type_value" select="@type"/></xsl:otherwise>
        </xsl:choose>
        
        <xsl:choose>
            <xsl:when test="$name='era'">
                <!-- index of era starts from  0 -->
                <saxon:assign name="num_expect_preceding_sibling" select="number($type_value)"/>
            </xsl:when>
            <xsl:otherwise><saxon:assign name="num_expect_preceding_sibling" select="number($type_value)-1"/></xsl:otherwise>
        </xsl:choose>
        
        <!--xsl:variable name="num_preceding_sibling" select="count(preceding-sibling::node()[name()=$name and  (not(@draft))])
            + count(preceding-sibling::node()[name()=$name and @draft!='provisional' and @draft!='unconfirmed'])"></xsl:variable-->
        <xsl:variable name="num_preceding_sibling" 
         select="count(preceding-sibling::node()[name()=$name and (not(@draft) or @draft!='provisional' and @draft!='unconfirmed') and not(@yeartype)])"></xsl:variable>
        
        <xsl:if test=" $num_expect_preceding_sibling > $num_preceding_sibling">
            <xsl:if test="$num_preceding_sibling > 0">
                <xsl:for-each select="(preceding-sibling::node()[name()=$name and (not(@draft) or @draft!='provisional' and @draft!='unconfirmed') and not(@yeartype)])[last()]">
                    <xsl:choose>
                        <xsl:when test="$name='day'">
                            <!--TODO: too bad that assign name can not be variable -->
                            <xsl:if test="@type='sun'"><saxon:assign name="last_sibling_type" select="1"/> </xsl:if>
                            <xsl:if test="@type='mon'"><saxon:assign name="last_sibling_type" select="2"/> </xsl:if>
                            <xsl:if test="@type='tue'"><saxon:assign name="last_sibling_type" select="3"/> </xsl:if>
                            <xsl:if test="@type='wed'"><saxon:assign name="last_sibling_type" select="4"/> </xsl:if>
                            <xsl:if test="@type='thu'"><saxon:assign name="last_sibling_type" select="5"/> </xsl:if>
                            <xsl:if test="@type='fri'"><saxon:assign name="last_sibling_type" select="6"/> </xsl:if>
                            <xsl:if test="@type='sat'"><saxon:assign name="last_sibling_type" select="7"/> </xsl:if>
                        </xsl:when>
                        <xsl:otherwise><saxon:assign name="last_sibling_type" select="@type"/></xsl:otherwise>
                    </xsl:choose>
                </xsl:for-each>
                <xsl:call-template name="retain_preceding_positions">
                    <xsl:with-param name="num" select="number($type_value)-number($last_sibling_type)-1"></xsl:with-param>
                </xsl:call-template>
            </xsl:if>
            <xsl:if test="$num_preceding_sibling = 0">  
                <xsl:call-template name="retain_preceding_positions">
                    <xsl:with-param name="num" select="$num_expect_preceding_sibling"></xsl:with-param>
                </xsl:call-template>
            </xsl:if>
        </xsl:if>
        <xsl:text>"</xsl:text><xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/><xsl:text>"</xsl:text>
        <xsl:if test="$num>position()">
            <xsl:text>,</xsl:text>
        </xsl:if>            
    </xsl:for-each>
    <xsl:text>]</xsl:text>
</xsl:template>    
    
<xsl:variable name="i" select="0" saxon:assignable="yes"/>    
<xsl:template name="retain_preceding_positions">
    <xsl:param name="num"></xsl:param>
    <saxon:assign name="i" select="0"/>
    <saxon:while test="$num > $i">
        <xsl:text>undefined,</xsl:text>
        <saxon:assign name="i" select="$i+1"/>
    </saxon:while>   
</xsl:template>
    
<xsl:template name="ignore" match="cyclicNameSets | monthPatterns"></xsl:template>

  <!-- too bad that can only use standard xsl:call-template(name can not be variable) 
         error occurs if use <saxon:call-templates($templateToCall)  /> -->
 <xsl:template name="invoke_template_by_name">
     <xsl:param name="templateName"></xsl:param>
     <xsl:param name="name"></xsl:param> 
     <xsl:param name="width"></xsl:param>
	 <xsl:param name="ctx"></xsl:param>
     <xsl:param name="fromLocaleAlias"></xsl:param>
     <xsl:if test="$templateName='top'">
         <xsl:call-template name="top"></xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='calendar'">
         <xsl:call-template name="calendar">
		 	<xsl:with-param name="fromLocaleAlias" select="$fromLocaleAlias"></xsl:with-param>
		 </xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='months_days_quarters_dayPeriods'">
         <xsl:call-template name="months_days_quarters_dayPeriods">
		  	  <xsl:with-param name="name" select="$name"></xsl:with-param>
              <xsl:with-param name="width" select="$width"></xsl:with-param>
			  <xsl:with-param name="ctx" select="$ctx"></xsl:with-param>
             <xsl:with-param name="fromLocaleAlias" select="$fromLocaleAlias"></xsl:with-param>
          </xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='eras'">
         <xsl:call-template name="eras">
             <xsl:with-param name="name" select="$name"></xsl:with-param>
             <xsl:with-param name="fromLocaleAlias" select="$fromLocaleAlias"></xsl:with-param>
         </xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='date_time_Formats'">
         <xsl:call-template name="date_time_Formats">
             <xsl:with-param name="width" select="$width"></xsl:with-param>
             <xsl:with-param name="fromLocaleAlias" select="$fromLocaleAlias"></xsl:with-param>
         </xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='dateTimeFormats'">
         <xsl:call-template name="dateTimeFormats">
             <xsl:with-param name="width" select="$width"></xsl:with-param>
             <xsl:with-param name="fromLocaleAlias" select="$fromLocaleAlias"></xsl:with-param>
         </xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='fields'">
         <xsl:call-template name="fields">
             <xsl:with-param name="width" select="$width"></xsl:with-param>
             <xsl:with-param name="fromLocaleAlias" select="$fromLocaleAlias"></xsl:with-param>
         </xsl:call-template>
     </xsl:if>     
 </xsl:template>
    
</xsl:stylesheet>
