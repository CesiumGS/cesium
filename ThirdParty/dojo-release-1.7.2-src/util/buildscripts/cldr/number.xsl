<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:saxon="http://saxon.sf.net/" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" extension-element-prefixes="saxon" version="2.0">
<xsl:import href="util.xsl"/>
<xsl:output method="text" indent="yes" saxon:byte-order-mark="yes"/>
<!-- list the data elements whose spaces should be preserved
       it seems listing only the parent node doesn't work -->
<xsl:preserve-space elements="decimal group list pattern currencyMatch surroundingMatch insertBetween"/>
<xsl:strip-space elements="*"/> 

<xsl:template match="/">
     <xsl:apply-templates/>
</xsl:template>

<!-- process ldml,numbers-->
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
                <!-- ldml -->
                <xsl:if test="name()='ldml'">
                    <!-- numbers -->
                    <xsl:for-each select="numbers">
                        <xsl:result-document href="number.js" encoding="UTF-8"><!--<xsl:value-of select="codepoints-to-string(65279)"/>-->// generated from ldml/main/*.xml, xpath: ldml/numbers
({<xsl:call-template name="numbers"></xsl:call-template>
})
</xsl:result-document>
                    </xsl:for-each>
                </xsl:if>
         </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<!-- process numbers-->
<xsl:template name="numbers" match="numbers">
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">numbers</xsl:with-param>
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

<!-- process symbols -->
<xsl:template name="symbols" match="symbols">
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">symbols</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
                </xsl:call-template>     
            </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
            <xsl:for-each select="*[not(@draft)] | *[@draft!='provisional' and @draft!='unconfirmed']">
                <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="name()"></xsl:value-of>
                <xsl:text>':"</xsl:text>
                <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"></xsl:value-of>
                <xsl:text>"</xsl:text>
                <!--xsl:if test="count(following-sibling::*)>0
                    or count(parent::node()/following-sibling::*)>0">
                    <xsl:text>,</xsl:text>
                </xsl:if-->                
            </xsl:for-each>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>
    
<!-- process decimalFormats | scientificFormats | percentFormats | currencyFormats -->       
<xsl:template name="formats" match="decimalFormats | scientificFormats | percentFormats | currencyFormats">
    <xsl:param name="width" select="@type"></xsl:param>
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->  
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">formats</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
					<xsl:with-param name="width" select="$width"></xsl:with-param>
                </xsl:call-template>
            </xsl:for-each>       
        </xsl:when>
        <xsl:otherwise>
            <xsl:choose>
                <xsl:when test="contains(name(),'Formats')">                   
                    <xsl:for-each select="*">
                        <xsl:call-template name="formats"></xsl:call-template>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:if test="name()!='default'">
                        <xsl:if test="name()='currencySpacing'">
                                <xsl:call-template name="currencySpacing"></xsl:call-template>
                        </xsl:if><xsl:for-each select=".//pattern[not(@draft)] | 
                          .//pattern[@draft!='provisional' and @draft!='unconfirmed']">
			                <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="name(..)"></xsl:value-of>                            
                            <xsl:if test="string-length($width)>0">
                                <xsl:text>-</xsl:text>
                                <xsl:value-of select="$width"></xsl:value-of>
                            </xsl:if>
                            <xsl:text>':"</xsl:text><xsl:value-of select="replace(.,'&quot;', '\\&quot;')"/>
                            <xsl:text>"</xsl:text>
                            <!--xsl:if test="count(parent::node()/parent::node()/following-sibling::*)>0
                                or count(parent::node()/parent::node()/parent::node()/following-sibling::*)>0">
                                   <xsl:text>,</xsl:text>
                            </xsl:if-->
                        </xsl:for-each>                      
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:otherwise>
    </xsl:choose>    
</xsl:template>
    
<!-- process currencySpacing -->     
<xsl:template name="currencySpacing">
    <xsl:choose>
        <xsl:when test="count(./alias)>0">
            <!-- Handle Alias -->
            <xsl:for-each select="./alias">
                <xsl:call-template name="alias_template">
                    <xsl:with-param name="templateToCall">symbols</xsl:with-param>
                    <xsl:with-param name="source" select="@source"></xsl:with-param>
                    <xsl:with-param name="xpath" select="@path"></xsl:with-param>
                </xsl:call-template>     
            </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
            <xsl:choose>
                <xsl:when test="name()='currencySpacing'
                                  or name()='beforeCurrency' 
                                  or name()='afterCurrency'" >
                    <xsl:for-each select="*">
                        <xsl:call-template name="currencySpacing"></xsl:call-template>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                   <xsl:if test=".[(not(@draft) or @draft!='provisional' and @draft!='unconfirmed')]">
	                <xsl:call-template name="insert_comma"/>
	'<xsl:value-of select="name(../..)"></xsl:value-of>
                    <xsl:text>-</xsl:text>
                    <xsl:value-of select="name(..)"></xsl:value-of>
                    <xsl:text>-</xsl:text>
                    <xsl:value-of select="name()"></xsl:value-of>
                     <xsl:text>':"</xsl:text>                   
                     <xsl:value-of select="replace(.,'&quot;', '\\&quot;')"></xsl:value-of>
                     <xsl:text>"</xsl:text>
                    <!--xsl:if test="count(following-sibling::*)>0
                        or count(parent::node()/following-sibling::*)>0
                        or count(parent::node()/parent::node()/following-sibling::*)>0
                        or count(parent::node()/parent::node()/parent::node()/following-sibling::*)>0">
                        <xsl:text>,</xsl:text>
                    </xsl:if-->
                   </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:otherwise> 
      </xsl:choose>
</xsl:template>

<xsl:template name="ignore" match="defaultNumberingSystem | currencies"></xsl:template>

  <!-- too bad that can only use standard xsl:call-template(name can not be variable) 
         error occurs if use <saxson:call-templates($templateToCall)  /> -->
 <xsl:template name="invoke_template_by_name">
     <xsl:param name="templateName"></xsl:param>
     <xsl:param name="name"></xsl:param> 
     <xsl:param name="width"></xsl:param>
	 <xsl:param name="ctx"></xsl:param>
	 <xsl:param name="fromLocaleAlias"></xsl:param>
     <xsl:if test="$templateName='top'">
         <xsl:call-template name="top"></xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='numbers'">
         <xsl:call-template name="numbers"></xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='symbols'">
         <xsl:call-template name="symbols"></xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='formats'">
         <xsl:call-template name="formats">
             <xsl:with-param name="width" select="$width"></xsl:with-param>
         </xsl:call-template>
     </xsl:if>
     <xsl:if test="$templateName='currencySpacing'">
         <xsl:call-template name="currencySpacing"></xsl:call-template>
     </xsl:if>
 </xsl:template>
</xsl:stylesheet>
