<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:saxon="http://saxon.sf.net/" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" extension-element-prefixes="saxon" version="2.0">

    <xsl:variable name="first" select="true()" saxon:assignable="yes"/>
    <xsl:variable name="basedirsansslash" saxon:assignable="yes"/>

    <xsl:param name="basedir"></xsl:param>

    <xsl:template name="insert_comma">
	    <xsl:choose>
		    <xsl:when test="$first">
			    <saxon:assign name="first" select="false()"/>
	        </xsl:when>
            <xsl:otherwise>
			    <xsl:text>,</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Sub output routine-->
    <xsl:variable name="vLowercaseChars_CONST" select="'abcdefghijklmnopqrstuvwxyz'"/> 
    <xsl:variable name="vUppercaseChars_CONST" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
    <xsl:template name="camel_case">
        <xsl:param name="name"></xsl:param>
        <xsl:variable name="words" select="tokenize($name, '-')"></xsl:variable>
        <xsl:for-each select="$words">
            <xsl:choose>
                <xsl:when test="position()=1">
                    <xsl:value-of select="."/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="translate(substring(., 1, 1), $vLowercaseChars_CONST, $vUppercaseChars_CONST)"/><xsl:value-of select="substring(., 2)"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:for-each>
    </xsl:template>

    <!--xsl:template name="invoke_template_by_name">
        <xsl:param name="templateName"></xsl:param>
        <xsl:param name="name"></xsl:param> 
        <xsl:param name="width"></xsl:param>
    </xsl:template-->

    <!-- recursive process for alias -->
    <xsl:template name="alias_template">
        <xsl:param name="templateToCall"></xsl:param>
        <xsl:param name="source"></xsl:param>
        <xsl:param name="xpath"></xsl:param>
        <xsl:param name="name"></xsl:param>
        <xsl:param name="width"></xsl:param>
        <xsl:param name="ctx"></xsl:param>
        <xsl:choose>            
            <xsl:when test="compare($source,'locale')=0">
                <!-- source="locale" -->
                <xsl:for-each select="saxon:evaluate(concat('../',$xpath))">   
                    <xsl:call-template name="invoke_template_by_name">
                        <xsl:with-param name="templateName" select="$templateToCall"></xsl:with-param>
                        <xsl:with-param name="name" select="$name"></xsl:with-param>
                        <xsl:with-param name="width" select="$width"></xsl:with-param>
                        <xsl:with-param name="ctx" select="$ctx"></xsl:with-param>
                        <xsl:with-param name="fromLocaleAlias" select="true()"></xsl:with-param>
                    </xsl:call-template>
                </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
                <!-- source is an external xml file -->
                <xsl:if test="string-length($xpath)>0">
                    <xsl:choose>
                        <xsl:when test="starts-with($basedir, '/')">
                            <saxon:assign name="basedirsansslash" select="substring($basedir, 2)"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <saxon:assign name="basedirsansslash" select="$basedir"/>
                        </xsl:otherwise>
                    </xsl:choose>
	                <xsl:for-each select="doc(concat('file:///',concat($basedirsansslash,concat($source,'.xml'))))">
                        <xsl:for-each select="saxon:evaluate($xpath)">
                            <xsl:call-template name="invoke_template_by_name">
                                <xsl:with-param name="templateName" select="$templateToCall"></xsl:with-param>
                                <xsl:with-param name="name" select="$name"></xsl:with-param>
                                <xsl:with-param name="width" select="$width"></xsl:with-param>
                                <xsl:with-param name="ctx" select="$ctx"></xsl:with-param>
                                <xsl:with-param name="fromLocaleAlias" select="false()"></xsl:with-param>
                            </xsl:call-template>
                        </xsl:for-each>
                    </xsl:for-each>
                </xsl:if>            
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>   
</xsl:stylesheet>
